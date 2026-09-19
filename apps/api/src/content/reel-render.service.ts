import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { SupabaseStorageService } from './supabase-storage.service';

const execAsync = promisify(exec);

type SceneRow = {
  id: string;
  sceneNumber: number;
  text: string;
  imagePrompt: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  duration: number;
};

/**
 * Real reel render pipeline. Each capability degrades gracefully so the job
 * never fabricates a fake MP4:
 *  - TTS narration via ElevenLabs (needs ELEVENLABS_API_KEY)
 *  - scene images via OpenAI Images/DALL-E (needs AiService OpenAI client)
 *  - MP4 compose via FFmpeg (must be on PATH)
 *  - upload via Supabase Storage (needs SUPABASE_* )
 *
 * If FFmpeg is unavailable the project is marked FAILED with a clear error
 * rather than returning a placeholder video.
 */
@Injectable()
export class ReelRenderService {
  private readonly logger = new Logger(ReelRenderService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly storage: SupabaseStorageService,
  ) {}

  /** Entry point invoked by the queue worker (or inline). */
  async render(projectId: string) {
    const project = await this.prisma.reelProject.findUnique({
      where: { id: projectId },
      include: { scenes: { orderBy: { sceneNumber: 'asc' } } },
    });
    if (!project) {
      this.logger.warn(`renderReel: project ${projectId} not found`);
      return;
    }

    await this.prisma.reelProject.update({
      where: { id: projectId },
      data: { status: 'GENERATING' },
    });

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `reel-${projectId}-`));
    try {
      const hasFfmpeg = await this.ffmpegAvailable();
      if (!hasFfmpeg) {
        throw new Error('FFmpeg is not installed on this host — cannot compile MP4.');
      }

      const prepared = await this.prepareScenes(project.scenes, project.voiceVoiceId, workDir);
      const outputPath = path.join(workDir, 'output.mp4');
      await this.composeVideo(prepared, outputPath);

      const buffer = await fs.readFile(outputPath);
      const videoUrl = await this.storage.uploadFile(
        buffer,
        `reel-${projectId}.mp4`,
        'video/mp4',
        'Reels',
      );

      const updated = await this.prisma.reelProject.update({
        where: { id: projectId },
        data: { videoUrl, status: 'COMPLETED' },
        include: { scenes: { orderBy: { sceneNumber: 'asc' } } },
      });
      this.logger.log(`Reel ${projectId} rendered → ${videoUrl}`);
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Render failed';
      this.logger.error(`Reel ${projectId} render failed: ${message}`);
      await this.prisma.reelProject.update({
        where: { id: projectId },
        data: { status: 'FAILED' },
      });
      throw err;
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /** Download/generate an image + audio for each scene into the work dir. */
  private async prepareScenes(scenes: SceneRow[], voiceId: string | null, workDir: string) {
    const prepared: Array<{ imagePath: string; audioPath: string | null; duration: number }> = [];

    for (const scene of scenes) {
      const imagePath = path.join(workDir, `scene-${scene.sceneNumber}.jpg`);
      const imageUrl = await this.resolveSceneImage(scene);
      await this.downloadTo(imageUrl, imagePath);

      let audioPath: string | null = null;
      let duration = scene.duration || 5;
      const audioBuffer = await this.generateNarration(scene.text, voiceId);
      if (audioBuffer) {
        audioPath = path.join(workDir, `scene-${scene.sceneNumber}.mp3`);
        await fs.writeFile(audioPath, audioBuffer);
        const measured = await this.probeDuration(audioPath);
        if (measured) duration = measured;
      }

      prepared.push({ imagePath, audioPath, duration });
    }

    return prepared;
  }

  /** Prefer a stored/generated image; generate via DALL-E when possible. */
  private async resolveSceneImage(scene: SceneRow): Promise<string> {
    if (scene.imageUrl && /^https?:\/\//.test(scene.imageUrl)) {
      return scene.imageUrl;
    }
    const generated = await this.generateImage(scene.imagePrompt || scene.text);
    if (generated) return generated;
    // Last-resort neutral gradient placeholder (still a real reachable image).
    return 'https://placehold.co/1080x1920/111827/ffffff.jpg';
  }

  private async generateImage(prompt: string): Promise<string | null> {
    const client = this.aiService.getClient();
    // Image generation is an OpenAI-only capability here (Ollama has no images API).
    if (!client || !this.config.get<string>('OPENAI_API_KEY')?.trim()) return null;
    try {
      const res = await client.images.generate({
        model: 'dall-e-3',
        prompt: `Vertical 9:16 social media graphic. ${prompt}. Premium, modern, high quality. No text.`,
        n: 1,
        size: '1024x1792',
      });
      return res.data?.[0]?.url ?? null;
    } catch (err) {
      this.logger.warn(`Image generation failed: ${(err as Error).message}`);
      return null;
    }
  }

  private async generateNarration(text: string, voiceId: string | null): Promise<Buffer | null> {
    const apiKey = this.config.get<string>('ELEVENLABS_API_KEY')?.trim();
    if (!apiKey) return null;
    const voice = voiceId && !voiceId.startsWith('eleven_labs_')
      ? voiceId
      : this.config.get<string>('ELEVENLABS_DEFAULT_VOICE_ID')?.trim() || '21m00Tcm4TlvDq8ikWAM';
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      });
      if (!res.ok) {
        throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      this.logger.warn(`Narration generation failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Compose a vertical MP4 from per-scene image (+ optional audio) clips using
   * FFmpeg. Each scene becomes a clip; clips are concatenated.
   */
  private async composeVideo(
    scenes: Array<{ imagePath: string; audioPath: string | null; duration: number }>,
    outputPath: string,
  ) {
    const workDir = path.dirname(outputPath);
    const clipPaths: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      const clip = path.join(workDir, `clip-${i}.mp4`);
      const dur = Math.max(1, s.duration);

      // Scale/pad to 1080x1920, 30fps. Attach audio when present, else silent.
      const vf =
        'scale=1080:1920:force_original_aspect_ratio=decrease,' +
        'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p';

      let cmd: string;
      if (s.audioPath) {
        cmd =
          `ffmpeg -y -loop 1 -i "${s.imagePath}" -i "${s.audioPath}" ` +
          `-t ${dur} -vf "${vf}" -r 30 -c:v libx264 -c:a aac -shortest "${clip}"`;
      } else {
        cmd =
          `ffmpeg -y -loop 1 -i "${s.imagePath}" -f lavfi -i anullsrc=r=44100:cl=stereo ` +
          `-t ${dur} -vf "${vf}" -r 30 -c:v libx264 -c:a aac -shortest "${clip}"`;
      }
      await execAsync(cmd, { maxBuffer: 1024 * 1024 * 64 });
      clipPaths.push(clip);
    }

    // Concatenate clips via the concat demuxer.
    const listFile = path.join(workDir, 'concat.txt');
    await fs.writeFile(listFile, clipPaths.map((c) => `file '${c}'`).join('\n'));
    await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:v libx264 -c:a aac -movflags +faststart "${outputPath}"`,
      { maxBuffer: 1024 * 1024 * 64 },
    );
  }

  private async ffmpegAvailable(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version');
      return true;
    } catch {
      return false;
    }
  }

  private async probeDuration(file: string): Promise<number | null> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
      );
      const val = parseFloat(stdout.trim());
      return Number.isFinite(val) && val > 0 ? val : null;
    } catch {
      return null;
    }
  }

  private async downloadTo(url: string, dest: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download asset (${res.status}): ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(dest, buf);
  }
}
