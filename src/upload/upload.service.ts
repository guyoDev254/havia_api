import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../common/services/storage.service';

@Injectable()
export class UploadService {
  constructor(
    private storageService: StorageService,
    private configService: ConfigService,
  ) {}

  /**
   * Process uploaded file and return public URL
   */
  processUploadedFile(file: Express.Multer.File, folder: string = 'general') {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

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
  processUploadedFiles(files: Express.Multer.File[], folder: string = 'general') {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    return files.map((file) => this.processUploadedFile(file, folder));
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(filename: string, folder: string = 'general'): Promise<void> {
    await this.storageService.deleteFile(filename, folder);
  }
}

