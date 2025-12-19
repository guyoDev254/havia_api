import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ClubResourceType } from '@prisma/client';

@ApiTags('club-resources')
@Controller('clubs/:clubId/resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new resource for a club' })
  async create(
    @CurrentUser() user: any,
    @Param('clubId') clubId: string,
    @Body() data: CreateResourceDto,
  ) {
    return this.resourcesService.create(clubId, user.id, data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all resources for a club' })
  @ApiQuery({ name: 'type', required: false, enum: ClubResourceType })
  @ApiQuery({ name: 'category', required: false, type: String })
  async findAll(
    @CurrentUser() user: any,
    @Param('clubId') clubId: string,
    @Query('type') type?: ClubResourceType,
    @Query('category') category?: string,
  ) {
    return this.resourcesService.findAll(clubId, user?.id, type, category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resource by ID' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.resourcesService.findOne(id, user?.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a resource' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: UpdateResourceDto,
  ) {
    return this.resourcesService.update(id, user.id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a resource' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.resourcesService.remove(id, user.id);
  }

  @Post(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record a resource download' })
  async recordDownload(@CurrentUser() user: any, @Param('id') id: string) {
    return this.resourcesService.recordDownload(id, user.id);
  }
}

