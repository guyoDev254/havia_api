import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly uploadPath: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadPath = this.configService.get<string>('UPLOAD_PATH') || './uploads';
    // Use API URL for file serving
    const apiPort = this.configService.get<string>('PORT') || '8000';
    const apiHost = this.configService.get<string>('API_HOST') || 'http://localhost';
    this.baseUrl = this.configService.get<string>('BASE_URL') || `${apiHost}:${apiPort}`;
  }

  /**
   * Get the public URL for an uploaded file
   */
  getFileUrl(filename: string, folder: string = 'profile-images'): string {
    return `${this.baseUrl}/uploads/${folder}/${filename}`;
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filename: string, folder: string = 'profile-images'): Promise<void> {
    const filePath = path.join(this.uploadPath, folder, filename);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
      // Don't throw error, just log it
    }
  }

  /**
   * Check if file exists
   */
  fileExists(filename: string, folder: string = 'profile-images'): boolean {
    const filePath = path.join(this.uploadPath, folder, filename);
    return fs.existsSync(filePath);
  }
}

