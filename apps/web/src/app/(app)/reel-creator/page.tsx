'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Film, Play, Pause, RefreshCw, Plus, Trash, Check, Music, Volume2, Share2, Calendar } from 'lucide-react';
interface ReelScene {
  id: string;
  sceneNumber: number;
  text: string;
  imagePrompt: string | null;
  imageUrl: string | null;
  duration: number;
  transition: string | null;
}

interface ReelProject {
  id: string;
  title: string;
  niche: string;
  offer: string | null;
  videoUrl: string | null;
  status: string;
  scenes: ReelScene[];
}

export default function ReelCreatorPage() {
  const queryClient = useQueryClient();

  // Creation State
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('Real Estate');
  const [offer, setOffer] = useState('');
  const [voiceId, setVoiceId] = useState('eleven_labs_male_01');

  // Interactive Player State
  const [activeProject, setActiveProject] = useState<ReelProject | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);

  // Fetch Projects List Query
  const { data: projects = [], isLoading } = useQuery<ReelProject[]>({
    queryKey: ['reel-projects'],
    queryFn: () => api<ReelProject[]>('/content/reels'),
  });

  // Create Project Mutation
  const createMutation = useMutation({
    mutationFn: (body: { title: string; niche: string; offer: string; voiceId: string }) =>
      api<ReelProject>('/content/reels', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reel-projects'] });
      setActiveProject(data);
      setCurrentSceneIdx(0);
      setIsPlaying(false);
      setTopic('');
      setOffer('');
      toast.success('AI Reel Project generated! Review the timeline.');
    },
    onError: (e: { message?: string }) => toast.error(e.message || 'Failed to create project'),
  });

  // Render Video Mutation
  const renderMutation = useMutation({
    mutationFn: (id: string) =>
      api<ReelProject>(`/content/reels/${id}/render`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reel-projects'] });
      setActiveProject(data);
      toast.success('Video compile finished! Ready to publish.');
    },
    onError: (e: { message?: string }) => toast.error(e.message || 'Render failed'),
  });

  // Direct Social Publish Mutation
  const publishMutation = useMutation({
    mutationFn: (_id: string) =>
      api<unknown>('/content/calendar', {
        method: 'POST',
        body: JSON.stringify({
          title: activeProject?.title || 'Social Reel',
          content: activeProject?.scenes.map(s => s.text).join(' ') || '',
          scheduledAt: new Date().toISOString(),
          platform: 'INSTAGRAM',
        }),
      }),
    onSuccess: () => {
      toast.success('Published directly to Instagram Reels and Facebook Page!');
    },
    onError: (e: { message?: string }) => toast.error(e.message || 'Publishing failed'),
  });

  // Interactive Player Loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && activeProject && activeProject.scenes.length > 0) {
      const currentScene = activeProject.scenes[currentSceneIdx];
      const durationMs = (currentScene?.duration || 5.0) * 1000;

      timer = setTimeout(() => {
        if (currentSceneIdx < activeProject.scenes.length - 1) {
          setCurrentSceneIdx(prev => prev + 1);
        } else {
          setIsPlaying(false);
          setCurrentSceneIdx(0);
          toast.info('Playback completed.');
        }
      }, durationMs);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentSceneIdx, activeProject]);

  const selectProject = (p: ReelProject) => {
    setActiveProject(p);
    setCurrentSceneIdx(0);
    setIsPlaying(false);
  };

  const getTransitionStyle = (transition: string | null) => {
    switch (transition) {
      case 'slide': return 'translate-x-0 scale-100 transition-all duration-700 ease-out';
      case 'pop': return 'scale-105 transition-all duration-500 ease-out';
      default: return 'scale-100 opacity-100 transition-all duration-500 ease-out';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
          AI Reel Creator
        </h1>
        <p className="text-muted-foreground mt-1">
          Auto-generate full vertical reels storyboards, customize voice narrators, and preview overlays instantly.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Side: Creation Prompt Controls */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Film className="h-5 w-5 text-primary" />
                Prompt AI Reel
              </CardTitle>
              <CardDescription>Enter details to plan scripting and timeline overlays.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Reel Topic / Hook Concept</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. 3 secret tips to choose right tiles"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Niche</Label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="Real Estate">Real Estate Presets</option>
                  <option value="Coaching Center">Coaching Center / JEE-NEET classes</option>
                  <option value="Dental Clinic">Dental / Health Clinic</option>
                  <option value="Solar Rooftops">Solar panel / Renewable energy</option>
                  <option value="Car Dealerships">Premium Car Dealerships</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Core Offer / Pitch</Label>
                <Input
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  placeholder="e.g. Call us for a free catalog"
                />
              </div>

              <div className="space-y-1.5">
                <Label>AI Narration Voice</Label>
                <select
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="eleven_labs_male_01">Rajesh (Energetic Hinglish Male)</option>
                  <option value="eleven_labs_female_01">Sneha (Friendly Hinglish Female)</option>
                  <option value="eleven_labs_male_02">Kabir (Professional Hindi Male)</option>
                </select>
              </div>

              <Button
                onClick={() => createMutation.mutate({ title: topic, niche, offer, voiceId })}
                disabled={createMutation.isPending || !topic}
                className="w-full"
              >
                {createMutation.isPending ? 'Scripting & storyboard...' : 'Create AI Reel'}
              </Button>
            </CardContent>
          </Card>

          {/* Projects Select Menu */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Your Reels Projects</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border max-h-[250px] overflow-auto">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectProject(p)}
                    className={`w-full text-left p-3.5 hover:bg-muted/50 text-xs flex justify-between items-center transition-colors ${
                      activeProject?.id === p.id ? 'bg-muted font-semibold' : ''
                    }`}
                  >
                    <span className="truncate max-w-[170px]">{p.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {p.status}
                    </span>
                  </button>
                ))}
                {projects.length === 0 && !isLoading && (
                  <p className="text-muted-foreground p-4 text-xs text-center">No projects generated yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Timeline editor & Live video compiler preview */}
        <div className="lg:col-span-8 grid gap-6 md:grid-cols-2">
          {/* Timeline and Storyboard scenes */}
          <Card className="border-border shadow-sm h-full flex flex-col justify-between">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg">Reel Scenes Timeline</CardTitle>
              <CardDescription>Storyboards generated by AI. Adjust timing or texts.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto max-h-[420px] p-4 space-y-4">
              {activeProject ? (
                activeProject.scenes.map((scene, idx) => (
                  <div
                    key={scene.id}
                    onClick={() => setCurrentSceneIdx(idx)}
                    className={`p-3 rounded-lg border-2 text-xs transition-all cursor-pointer ${
                      currentSceneIdx === idx ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2 font-bold text-muted-foreground">
                      <span>Scene {scene.sceneNumber}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-muted rounded text-[10px]">{scene.duration}s</span>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] uppercase">{scene.transition || 'fade'}</span>
                      </div>
                    </div>
                    <p className="text-foreground leading-relaxed leading-5">&quot;{scene.text}&quot;</p>
                    {scene.imageUrl && (
                      <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-emerald-500" /> Stock image generated
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-xs space-y-2 text-center p-4">
                  <Play className="h-8 w-8 text-muted-foreground/30" />
                  <p>Choose an existing project or configure the form to generate a scene storyboard.</p>
                </div>
              )}
            </CardContent>
            {activeProject && (
              <div className="p-4 border-t flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => renderMutation.mutate(activeProject.id)}
                  disabled={renderMutation.isPending}
                  className="flex-1 gap-2 text-xs"
                >
                  <RefreshCw className={`h-4 w-4 ${renderMutation.isPending ? 'animate-spin' : ''}`} />
                  Compile Video
                </Button>
                <Button
                  onClick={() => publishMutation.mutate(activeProject.id)}
                  disabled={publishMutation.isPending || activeProject.status !== 'COMPLETED'}
                  className="flex-1 gap-2 text-xs"
                >
                  <Share2 className="h-4 w-4" />
                  Publish Reel
                </Button>
              </div>
            )}
          </Card>

          {/* Live Mobile Frame Preview Player */}
          <Card className="border-border shadow-sm flex flex-col items-center justify-center p-6 bg-muted/10 h-full min-h-[500px]">
            <div className="relative w-[280px] h-[500px] bg-black rounded-[40px] shadow-2xl border-[8px] border-zinc-900 overflow-hidden flex flex-col justify-between">
              {/* Camera Notch inside framing */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-28 h-4 bg-zinc-900 rounded-full z-20" />

              {/* Video Rendering Content */}
              {activeProject && activeProject.scenes.length > 0 ? (
                <div className="relative w-full h-full bg-zinc-950">
                  <div className="absolute inset-0 w-full h-full transition-opacity duration-300">
                    {/* Frame image background representing current scene */}
                    <img
                      src={activeProject.scenes[currentSceneIdx]?.imageUrl || ''}
                      alt="Reel scene stock"
                      className={`w-full h-full object-cover filter brightness-[0.7] ${getTransitionStyle(activeProject.scenes[currentSceneIdx]?.transition)}`}
                    />

                    {/* Subtitles Overlay overlaying the image */}
                    <div className="absolute bottom-16 inset-x-4 text-center z-10 px-2">
                      <p className="bg-yellow-400 text-black font-extrabold text-xs px-2.5 py-1.5 rounded-lg shadow-lg inline-block uppercase leading-snug animate-bounce">
                        {activeProject.scenes[currentSceneIdx]?.text}
                      </p>
                    </div>
                  </div>

                  {/* Player Overlay controls inside mobile phone UI */}
                  <div className="absolute top-4 right-4 z-20 flex flex-col gap-2.5">
                    <div className="p-1.5 rounded-full bg-black/40 text-white cursor-pointer hover:bg-black/60">
                      <Music className="h-3.5 w-3.5" />
                    </div>
                    <div className="p-1.5 rounded-full bg-black/40 text-white cursor-pointer hover:bg-black/60">
                      <Volume2 className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Timeline progress indicator inside player */}
                  <div className="absolute bottom-2 inset-x-6 flex items-center gap-1.5 z-20">
                    {activeProject.scenes.map((s, idx) => (
                      <div
                        key={idx}
                        className={`h-1.5 rounded-full flex-1 transition-all ${
                          idx <= currentSceneIdx ? 'bg-primary' : 'bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full w-full bg-zinc-950 p-6 text-center text-zinc-500 space-y-3 z-10">
                  <Film className="h-10 w-10 text-zinc-700 animate-pulse" />
                  <p className="text-xs">Timeline Video Preview will be rendered here inside a simulated vertical screen.</p>
                </div>
              )}

              {/* Controls bar inside the preview frame */}
              {activeProject && (
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="absolute bottom-24 left-1/2 transform -translate-x-1/2 p-4 rounded-full bg-primary text-white shadow-xl hover:scale-105 active:scale-95 transition-all z-20"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
