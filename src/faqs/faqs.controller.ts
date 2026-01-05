import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FaqsService } from './faqs.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/permissions/permissions.constant';

@ApiTags('faqs')
@Controller('faqs')
export class FaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all FAQs (public endpoint)' })
  @ApiQuery({ name: 'active', required: false, type: Boolean, description: 'Filter by active status' })
  async findAll(@Query('active') active?: string) {
    const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
    return this.faqsService.findAll(isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get FAQ by ID (public endpoint)' })
  async findOne(@Param('id') id: string) {
    return this.faqsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new FAQ (admin only)' })
  @RequirePermissions(Permission.CREATE_CONTENT)
  async create(@Body() createFaqDto: CreateFaqDto) {
    return this.faqsService.create(createFaqDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update FAQ (admin only)' })
  @RequirePermissions(Permission.CREATE_CONTENT)
  async update(@Param('id') id: string, @Body() updateFaqDto: UpdateFaqDto) {
    return this.faqsService.update(id, updateFaqDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete FAQ (admin only)' })
  @RequirePermissions(Permission.CREATE_CONTENT)
  async remove(@Param('id') id: string) {
    return this.faqsService.remove(id);
  }
}

