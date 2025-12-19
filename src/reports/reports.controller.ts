import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/permissions/permissions.constant';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ReportStatus, ReportType, ReportEntityType } from '@prisma/client';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new report' })
  async createReport(@CurrentUser() user: any, @Body() createReportDto: CreateReportDto) {
    return this.reportsService.createReport(user.id, createReportDto);
  }

  @Get('my-reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reports filed by current user' })
  async getMyReports(@CurrentUser() user: any) {
    return this.reportsService.getReportsByUser(user.id);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.VIEW_REPORTS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get report statistics (admin only)' })
  async getReportStats() {
    return this.reportsService.getReportStats();
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.VIEW_REPORTS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all reports (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ReportStatus })
  @ApiQuery({ name: 'type', required: false, enum: ReportType })
  @ApiQuery({ name: 'entityType', required: false, enum: ReportEntityType })
  async getAllReports(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: ReportStatus,
    @Query('type') type?: ReportType,
    @Query('entityType') entityType?: ReportEntityType,
  ) {
    return this.reportsService.getAllReports(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
      type,
      entityType,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.VIEW_REPORTS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get report by ID (admin only)' })
  async getReportById(@Param('id') id: string) {
    return this.reportsService.getReportById(id);
  }

  @Put(':id/resolve')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.HANDLE_ABUSE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve a report (admin only)' })
  async resolveReport(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() resolveDto: ResolveReportDto,
  ) {
    return this.reportsService.resolveReport(admin.id, id, resolveDto);
  }
}

