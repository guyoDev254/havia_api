import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentStatus } from '@prisma/client';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private adminService: AdminService,
  ) {}

  async createContent(adminId: string, createDto: CreateContentDto) {
    const content = await this.prisma.content.create({
      data: {
        title: createDto.title,
        description: createDto.description,
        type: createDto.type,
        status: createDto.status || ContentStatus.DRAFT,
        featured: createDto.featured || false,
        image: createDto.image || null,
        url: createDto.url || null,
        tags: createDto.tags || [],
        metadata: createDto.metadata || {},
        createdBy: adminId,
        publishedAt: createDto.status === ContentStatus.PUBLISHED ? new Date() : null,
      },
    });

    // Log audit
    await this.adminService.logAudit({
      adminId,
      action: 'CREATE_CONTENT',
      entity: 'CONTENT',
      entityId: content.id,
      changes: {
        after: { title: content.title, type: content.type },
      },
    });

    return content;
  }

  async getAllContent(
    page = 1,
    limit = 20,
    type?: string,
    status?: ContentStatus,
    featured?: boolean,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }
    if (featured !== undefined) {
      where.featured = featured;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [content, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.content.count({ where }),
    ]);

    return {
      content,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getContentById(id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    return content;
  }

  async updateContent(adminId: string, id: string, updateDto: UpdateContentDto) {
    const existing = await this.prisma.content.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Content not found');
    }

    const data: any = {};
    if (updateDto.title !== undefined) data.title = updateDto.title;
    if (updateDto.description !== undefined) data.description = updateDto.description;
    if (updateDto.type !== undefined) data.type = updateDto.type;
    if (updateDto.status !== undefined) {
      data.status = updateDto.status;
      // Set publishedAt when status changes to PUBLISHED
      if (updateDto.status === ContentStatus.PUBLISHED && existing.status !== ContentStatus.PUBLISHED) {
        data.publishedAt = new Date();
      }
    }
    if (updateDto.featured !== undefined) data.featured = updateDto.featured;
    if (updateDto.image !== undefined) data.image = updateDto.image;
    if (updateDto.url !== undefined) data.url = updateDto.url;
    if (updateDto.tags !== undefined) data.tags = updateDto.tags;
    if (updateDto.metadata !== undefined) data.metadata = updateDto.metadata;

    const updated = await this.prisma.content.update({
      where: { id },
      data,
    });

    // Log audit
    await this.adminService.logAudit({
      adminId,
      action: 'UPDATE_CONTENT',
      entity: 'CONTENT',
      entityId: id,
      changes: {
        before: { status: existing.status, featured: existing.featured },
        after: { status: updated.status, featured: updated.featured },
      },
    });

    return updated;
  }

  async deleteContent(adminId: string, id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    await this.prisma.content.delete({
      where: { id },
    });

    // Log audit
    await this.adminService.logAudit({
      adminId,
      action: 'DELETE_CONTENT',
      entity: 'CONTENT',
      entityId: id,
      changes: {
        before: { title: content.title },
      },
    });

    return { message: 'Content deleted successfully' };
  }

  async getFeaturedContent(limit = 10) {
    return this.prisma.content.findMany({
      where: {
        featured: true,
        status: ContentStatus.PUBLISHED,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: limit,
    });
  }
}

