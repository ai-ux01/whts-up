import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly supabaseUrl: string | null = null;
  private readonly serviceRoleKey: string | null = null;
  private readonly bucketName: string;

  constructor(private config: ConfigService) {
    this.supabaseUrl = this.config.get<string>('SUPABASE_URL')?.trim() || null;
    this.serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim() || null;
    this.bucketName = this.config.get<string>('SUPABASE_STORAGE_BUCKET') || 'growth-media';

    if (!this.supabaseUrl || !this.serviceRoleKey) {
      this.logger.warn(
        'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured — media library will run in mock fallback mode.'
      );
    }
  }

  isConfigured(): boolean {
    return this.supabaseUrl !== null && this.serviceRoleKey !== null;
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    folder = 'General'
  ): Promise<string> {
    if (!this.isConfigured()) {
      this.logger.warn('Supabase not configured, returning local mock path');
      return `/assets/mock-uploads/${folder}/${filename}`;
    }

    try {
      const sanitizedFilename = filename.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '');
      const uniqueName = `${Date.now()}-${sanitizedFilename}`;
      const filePath = `${folder}/${uniqueName}`;

      const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucketName}/${filePath}`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.serviceRoleKey}`,
          'Content-Type': mimeType,
        },
        body: buffer as any,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.statusText} - ${errorText}`);
      }

      const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${filePath}`;
      this.logger.log(`Successfully uploaded asset to Supabase: ${publicUrl}`);
      return publicUrl;
    } catch (err) {
      this.logger.error('Supabase REST upload failed', err);
      throw new HttpException(
        'Supabase Storage upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'),
        HttpStatus.BAD_GATEWAY
      );
    }
  }
}
