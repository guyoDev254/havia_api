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
import { PartnershipsService } from './partnerships.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/permissions/permissions.constant';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { CreatePartnerProgramDto } from './dto/create-partner-program.dto';
import { PartnerStatus } from '@prisma/client';

@ApiTags('partnerships')
@Controller('partnerships')
export class PartnershipsController {
  constructor(private readonly partnershipsService: PartnershipsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.CREATE_PARTNER_PROFILES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new partner (admin only)' })
  async createPartner(
    @CurrentUser() admin: any,
    @Body() createDto: CreatePartnerDto,
  ) {
    return this.partnershipsService.createPartner(admin.id, createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PARTNERSHIPS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all partners (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: PartnerStatus })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAllPartners(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: PartnerStatus,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.partnershipsService.getAllPartners(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
      type,
      search,
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.VIEW_PARTNER_ENGAGEMENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get partnership statistics (admin only)' })
  async getStats() {
    return this.partnershipsService.getPartnerStats();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PARTNERSHIPS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get partner by ID (admin only)' })
  async getPartnerById(@Param('id') id: string) {
    return this.partnershipsService.getPartnerById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PARTNERSHIPS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update partner (admin only)' })
  async updatePartner(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() updateDto: UpdatePartnerDto,
  ) {
    return this.partnershipsService.updatePartner(admin.id, id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PARTNERSHIPS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete partner (admin only)' })
  async deletePartner(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.partnershipsService.deletePartner(admin.id, id);
  }

  @Post('programs')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.PUBLISH_PARTNER_PROGRAMS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create partner program (admin only)' })
  async createProgram(
    @CurrentUser() admin: any,
    @Body() createDto: CreatePartnerProgramDto,
  ) {
    return this.partnershipsService.createProgram(admin.id, createDto);
  }

  @Put('programs/:id')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.PUBLISH_PARTNER_PROGRAMS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update partner program (admin only)' })
  async updateProgram(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() updateDto: Partial<CreatePartnerProgramDto>,
  ) {
    return this.partnershipsService.updateProgram(admin.id, id, updateDto);
  }

  @Delete('programs/:id')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.PUBLISH_PARTNER_PROGRAMS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete partner program (admin only)' })
  async deleteProgram(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.partnershipsService.deleteProgram(admin.id, id);
  }
}

