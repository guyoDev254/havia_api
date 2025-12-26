import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UploadService } from './upload.service';
import { getMulterConfigForFolder } from '../common/config/multer.config';

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', getMulterConfigForFolder('images', 10 * 1024 * 1024)))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a single image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Optional folder name (default: images)',
        },
      },
    },
  })
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|gif)$/i }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return await this.uploadService.processUploadedFile(file, 'images');
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10, getMulterConfigForFolder('images', 10 * 1024 * 1024)))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple images (max 10)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadImages(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB per file
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|gif)$/i }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    return await this.uploadService.processUploadedFiles(files, 'images');
  }

  @Post('file')
  @UseInterceptors(FileInterceptor('file', getMulterConfigForFolder('files', 50 * 1024 * 1024)))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a single file (images, PDFs, documents, archives)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Optional folder name (default: files)',
        },
      },
    },
  })
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return await this.uploadService.processUploadedFile(file, 'files');
  }

  @Post('resource')
  @UseInterceptors(FileInterceptor('file', getMulterConfigForFolder('resources', 50 * 1024 * 1024)))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a resource file (for academic resources, etc.)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadResource(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return await this.uploadService.processUploadedFile(file, 'resources');
  }

  @Post('club-logo')
  @UseInterceptors(FileInterceptor('file', getMulterConfigForFolder('club-logos', 5 * 1024 * 1024)))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a club logo (square image, max 5MB)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadClubLogo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          // FileTypeValidator removed - multerConfig fileFilter already handles MIME type validation
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return await this.uploadService.processUploadedFile(file, 'club-logos');
  }

  @Post('club-banner')
  @UseInterceptors(FileInterceptor('file', getMulterConfigForFolder('club-banners', 10 * 1024 * 1024)))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a club banner (wide image, max 10MB)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadClubBanner(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          // FileTypeValidator removed - multerConfig fileFilter already handles MIME type validation
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return await this.uploadService.processUploadedFile(file, 'club-banners');
  }
}

