import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageType: 'local' | 'spaces';
  private readonly uploadPath: string;
  private readonly baseUrl: string;
  private s3Client: S3Client | null = null;
  private readonly spacesBucket: string | null = null;
  private readonly spacesEndpoint: string | null = null;
  private readonly spacesRegion: string | null = null;
  private readonly spacesCdnUrl: string | null = null;

  constructor(private configService: ConfigService) {
    // Determine storage type: 'spaces' if DO_SPACES_KEY is set, otherwise 'local'
    const spacesKey = this.configService.get<string>('DO_SPACES_KEY');
    this.storageType = spacesKey ? 'spaces' : 'local';

    // Local storage configuration
    this.uploadPath = this.configService.get<string>('UPLOAD_PATH') || './uploads';
    
    // DigitalOcean Spaces configuration
    if (this.storageType === 'spaces') {
      const spacesSecret = this.configService.get<string>('DO_SPACES_SECRET');
      const spacesRegion = this.configService.get<string>('DO_SPACES_REGION') || 'nyc3';
      this.spacesBucket = this.configService.get<string>('DO_SPACES_BUCKET');
      const spacesEndpoint = this.configService.get<string>('DO_SPACES_ENDPOINT');
      this.spacesEndpoint = spacesEndpoint || `https://${spacesRegion}.digitaloceanspaces.com`;
      this.spacesRegion = spacesRegion;
      this.spacesCdnUrl = this.configService.get<string>('DO_SPACES_CDN_URL');

      if (!spacesSecret || !this.spacesBucket) {
        this.logger.warn('DigitalOcean Spaces partially configured. Falling back to local storage.');
        this.storageType = 'local';
      } else {
        // Initialize S3 client for DigitalOcean Spaces (S3-compatible API)
        this.s3Client = new S3Client({
          endpoint: this.spacesEndpoint,
          region: this.spacesRegion,
          credentials: {
            accessKeyId: spacesKey,
            secretAccessKey: spacesSecret,
          },
          forcePathStyle: false, // DigitalOcean Spaces uses virtual-hosted style
        });
        this.logger.log(`Storage initialized: DigitalOcean Spaces (${this.spacesBucket})`);
      }
    }

    // Base URL for local storage (only used when storageType is 'local')
    if (this.storageType === 'local') {
      this.baseUrl = this.configService.get<string>('BASE_URL') || 
        (() => {
          const apiPort = this.configService.get<string>('PORT') || '8000';
          const apiHost = this.configService.get<string>('API_HOST') || 'http://localhost';
          return `${apiHost}:${apiPort}`;
        })();
      this.logger.log(`Storage initialized: Local filesystem (${this.uploadPath})`);
    }
  }

  /**
   * Get the public URL for an uploaded file
   */
  getFileUrl(filename: string, folder: string = 'profile-images'): string {
    // Remove any path separators from filename for security
    const safeFilename = filename.replace(/[\/\\]/g, '');

    if (this.storageType === 'spaces' && this.spacesBucket) {
      // Use CDN URL if available, otherwise use direct Spaces URL
      const baseUrl = this.spacesCdnUrl || `https://${this.spacesBucket}.${this.spacesRegion}.digitaloceanspaces.com`;
      return `${baseUrl}/${folder}/${safeFilename}`;
    }

    // Local storage URL
    return `${this.baseUrl}/uploads/${folder}/${safeFilename}`;
  }

  /**
   * Upload a file to storage (for Spaces)
   */
  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    folder: string = 'profile-images',
    contentType: string = 'application/octet-stream',
  ): Promise<string> {
    if (this.storageType === 'spaces' && this.s3Client && this.spacesBucket) {
      const key = `${folder}/${filename}`;
      
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.spacesBucket,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType,
            ACL: 'public-read', // Make files publicly accessible
          }),
        );
        this.logger.log(`File uploaded to Spaces: ${key}`);
        return this.getFileUrl(filename, folder);
      } catch (error) {
        this.logger.error(`Error uploading file to Spaces: ${error.message}`, error);
        throw error;
      }
    }

    // For local storage, file is already saved by Multer, just return URL
    return this.getFileUrl(filename, folder);
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filename: string, folder: string = 'profile-images'): Promise<void> {
    if (this.storageType === 'spaces' && this.s3Client && this.spacesBucket) {
      const key = `${folder}/${filename}`;
      
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.spacesBucket,
            Key: key,
          }),
        );
        this.logger.log(`File deleted from Spaces: ${key}`);
      } catch (error) {
        this.logger.error(`Error deleting file from Spaces: ${error.message}`, error);
        // Don't throw error, just log it
      }
      return;
    }

    // Local storage deletion
    const filePath = path.join(this.uploadPath, folder, filename);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      this.logger.error(`Error deleting file ${filePath}:`, error);
      // Don't throw error, just log it
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filename: string, folder: string = 'profile-images'): Promise<boolean> {
    if (this.storageType === 'spaces' && this.s3Client && this.spacesBucket) {
      const key = `${folder}/${filename}`;
      
      try {
        await this.s3Client.send(
          new HeadObjectCommand({
            Bucket: this.spacesBucket,
            Key: key,
          }),
        );
        return true;
      } catch (error) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
          return false;
        }
        this.logger.error(`Error checking file existence in Spaces: ${error.message}`, error);
        return false;
      }
    }

    // Local storage check
    const filePath = path.join(this.uploadPath, folder, filename);
    return fs.existsSync(filePath);
  }

  /**
   * Get storage type (useful for debugging)
   */
  getStorageType(): 'local' | 'spaces' {
    return this.storageType;
  }
}

