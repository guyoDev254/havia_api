import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../common/services/storage.service';
import * as fs from 'fs';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private storageService: StorageService,
    private configService: ConfigService,
  ) {}

  /**
   * Process uploaded file and return public URL
   * If Spaces is configured, uploads the file to Spaces after local save
   */
  async processUploadedFile(file: Express.Multer.File, folder: string = 'general') {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // If using Spaces, upload the file to Spaces
    if (this.storageService.getStorageType() === 'spaces' && file.path) {
      try {
        const fileBuffer = fs.readFileSync(file.path);
        const fileUrl = await this.storageService.uploadFile(
          fileBuffer,
          file.filename,
          folder,
          file.mimetype,
        );

        // Delete local file after successful upload to Spaces
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          this.logger.warn(`Failed to delete local file ${file.path}: ${error.message}`);
        }

        return {
          url: fileUrl,
          filename: file.filename,
          path: null, // No local path when using Spaces
          size: file.size,
          mimetype: file.mimetype,
        };
      } catch (error) {
        this.logger.error(`Failed to upload file to Spaces: ${error.message}`, error);
        // If Spaces upload fails, still return local URL as fallback
        // In production, you might want to throw an error instead
      }
    }

    // Local storage or fallback
    const fileUrl = this.storageService.getFileUrl(file.filename, folder);

    return {
      url: fileUrl,
      filename: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  /**
   * Process multiple uploaded files
   */
  async processUploadedFiles(files: Express.Multer.File[], folder: string = 'general') {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    return Promise.all(files.map((file) => this.processUploadedFile(file, folder)));
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(filename: string, folder: string = 'general'): Promise<void> {
    await this.storageService.deleteFile(filename, folder);
  }
}

