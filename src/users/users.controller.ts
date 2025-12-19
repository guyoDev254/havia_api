import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { StorageService } from '../common/services/storage.service';
import { multerConfig } from '../common/config/multer.config';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@CurrentUser() user: any, @Body() updateData: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, updateData);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  async searchUsers(@CurrentUser() user: any, @Query('q') query?: string, @Query('limit') limit?: string) {
    return this.usersService.searchUsers(query, limit ? parseInt(limit) : 20, user.id);
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiQuery({ name: 'token', required: true })
  async verifyEmail(@Query('token') token: string) {
    return this.usersService.verifyEmail(token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUser(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.findOne(id, user.id);
  }

  @Post(':id/follow')
  @ApiOperation({ summary: 'Follow a user' })
  async followUser(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.followUser(user.id, id);
  }

  @Post(':id/unfollow')
  @ApiOperation({ summary: 'Unfollow a user' })
  async unfollowUser(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.unfollowUser(user.id, id);
  }

  @Get(':id/followers')
  @ApiOperation({ summary: 'Get user followers' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  async getFollowers(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.usersService.getFollowers(id, limit ? parseInt(limit) : 20);
  }

  @Get(':id/following')
  @ApiOperation({ summary: 'Get users that this user is following' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  async getFollowing(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.usersService.getFollowing(id, limit ? parseInt(limit) : 20);
  }

  @Post('me/verify-email')
  @ApiOperation({ summary: 'Resend email verification' })
  async resendVerificationEmail(@CurrentUser() user: any) {
    return this.usersService.resendVerificationEmail(user.id);
  }

  @Post('me/deactivate')
  @ApiOperation({ summary: 'Deactivate user account' })
  async deactivateAccount(@CurrentUser() user: any) {
    return this.usersService.deactivateAccount(user.id);
  }


  @Post('me/upload-profile-image')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload profile image' })
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
  async uploadProfileImage(
    @CurrentUser() user: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          // FileTypeValidator removed - validation is handled by multerConfig.fileFilter
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      console.log('File uploaded:', {
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
      });

      // Get file URL - profile images are stored in profile-images folder
      const fileUrl = this.storageService.getFileUrl(file.filename, 'profile-images');
      
      // Delete old profile image if exists
      const currentUser = await this.usersService.findOne(user.id);
      if (currentUser.profileImage) {
        const oldFilename = currentUser.profileImage.split('/').pop();
        if (oldFilename) {
          await this.storageService.deleteFile(oldFilename, 'profile-images');
        }
      }
      
      // Update user profile with new image URL
      await this.usersService.updateProfile(user.id, { profileImage: fileUrl });
      
      return {
        message: 'Profile image uploaded successfully',
        url: fileUrl,
        filename: file.filename,
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      throw error;
    }
  }
}
