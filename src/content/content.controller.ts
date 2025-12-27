import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permission } from '../common/permissions/permissions.constant';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentStatus } from '@prisma/client';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.CREATE_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new content (admin only)' })
  async createContent(
    @CurrentUser() admin: any,
    @Body() createDto: CreateContentDto,
  ) {
    return this.contentService.createContent(admin.id, createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.CREATE_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all content (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ContentStatus })
  @ApiQuery({ name: 'featured', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAllContent(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('status') status?: ContentStatus,
    @Query('featured') featured?: string,
    @Query('search') search?: string,
  ) {
    return this.contentService.getAllContent(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      type,
      status,
      featured === 'true' ? true : featured === 'false' ? false : undefined,
      search,
    );
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured content (public)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFeaturedContent(@Query('limit') limit?: string) {
    return this.contentService.getFeaturedContent(limit ? parseInt(limit) : 10);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.CREATE_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get content by ID (admin only)' })
  async getContentById(@Param('id') id: string) {
    return this.contentService.getContentById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.CREATE_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update content (admin only)' })
  async updateContent(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateContentDto,
  ) {
    return this.contentService.updateContent(admin.id, id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.CREATE_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete content (admin only)' })
  async deleteContent(
    @CurrentUser() admin: any,
    @Param('id') id: string,
  ) {
    return this.contentService.deleteContent(admin.id, id);
  }
}

