import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClubFeaturesService } from './club-features.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateClubFeedDto } from './dto/create-club-feed.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { CreateFundraisingDto } from './dto/create-fundraising.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateFinancialContributionDto } from './dto/create-financial-contribution.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { VotePollDto } from './dto/vote-poll.dto';

@ApiTags('club-features')
@Controller('clubs/:clubId')
export class ClubFeaturesController {
  constructor(private readonly clubFeaturesService: ClubFeaturesService) {}

  // ==================== FEEDS ====================

  @Post('feeds')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a club feed (announcement, discussion, or poll)' })
  async createFeed(
    @CurrentUser() user: any,
    @Param('clubId') clubId: string,
    @Body() dto: CreateClubFeedDto,
  ) {
    return this.clubFeaturesService.createFeed(clubId, user.id, dto);
  }

  @Get('feeds')
  @ApiOperation({ summary: 'Get club feeds' })
  @ApiQuery({ name: 'type', required: false, enum: ['ANNOUNCEMENT', 'DISCUSSION', 'POLL'] })
  async getFeeds(
    @CurrentUser() user: any,
    @Param('clubId') clubId: string,
    @Query('type') type?: string,
  ) {
    return this.clubFeaturesService.getFeeds(clubId, user?.id, type as any);
  }

  @Post('feeds/:feedId/vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote on a poll' })
  async votePoll(
    @CurrentUser() user: any,
    @Param('clubId') clubId: string,
    @Param('feedId') feedId: string,
    @Body() dto: VotePollDto,
  ) {
    return this.clubFeaturesService.votePoll(clubId, feedId, user.id, dto);
  }

  // ==================== CONTRIBUTIONS ====================

  @Post('contributions')
  @ApiOperation({ summary: 'Create a contribution (volunteer, donation, or support)' })
  async createContribution(
    @CurrentUser() user: any,
    @Param('clubId') clubId: string,
    @Body() dto: CreateContributionDto,
  ) {
    return this.clubFeaturesService.createContribution(clubId, user?.id || null, dto);
  }

  @Get('contributions')
  @ApiOperation({ summary: 'Get club contributions' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getContributions(
    @Param('clubId') clubId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.clubFeaturesService.getContributions(clubId, type, status as any);
  }

  @Post('contributions/:contributionId/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a contribution (club admin only)' })
  async approveContribution(
    @CurrentUser() user: any,
    @Param('clubId') clubId: string,
    @Param('contributionId') contributionId: string,
  ) {
    return this.clubFeaturesService.approveContribution(clubId, contributionId, user.id);
  }

  // ==================== FUNDRAISING ====================

  @Post('fundraising')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a fundraising campaign (club admin only)' })
  async createFundraising(
    @CurrentUser() user: any,
    @Param('clubId') clubId: string,
    @Body() dto: CreateFundraisingDto,
  ) {
    return this.clubFeaturesService.createFundraising(clubId, user.id, dto);
  }

  @Get('fundraising')
  @ApiOperation({ summary: 'Get fundraising campaigns' })
  @ApiQuery({ name: 'status', required: false })
  async getFundraising(
    @Param('clubId') clubId: string,
    @Query('status') status?: string,
  ) {
    return this.clubFeaturesService.getFundraising(clubId, status as any);
  }

  // ==================== PROJECTS ====================

  @Post('projects')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a project (club admin only)' })
  async createProject(
    @CurrentUser() user: any,
    @Param('clubId') clubId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.clubFeaturesService.createProject(clubId, user.id, dto);
  }

  @Get('projects')
  @ApiOperation({ summary: 'Get club projects' })
  @ApiQuery({ name: 'status', required: false })
  async getProjects(
    @Param('clubId') clubId: string,
    @Query('status') status?: string,
  ) {
    return this.clubFeaturesService.getProjects(clubId, status as any);
  }

  @Post('projects/:projectId/milestones')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a project milestone' })
  async createMilestone(
    @Param('projectId') projectId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.clubFeaturesService.createMilestone(projectId, dto);
  }

  // ==================== ATTENDANCE ====================

  @Post('attendance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record attendance' })
  async recordAttendance(
    @CurrentUser() user: any,
    @Param('clubId') clubId: string,
    @Body() dto: CreateAttendanceDto,
  ) {
    return this.clubFeaturesService.recordAttendance(clubId, user.id, dto);
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Get attendance records' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'eventId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getAttendance(
    @Param('clubId') clubId: string,
    @Query('projectId') projectId?: string,
    @Query('eventId') eventId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.clubFeaturesService.getAttendance(
      clubId,
      projectId,
      eventId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ==================== FINANCIAL CONTRIBUTIONS ====================

  @Post('financial-contributions')
  @ApiOperation({ summary: 'Make a financial contribution' })
  async createFinancialContribution(
    @CurrentUser() user: any,
    @Param('clubId') clubId: string,
    @Body() dto: CreateFinancialContributionDto,
  ) {
    return this.clubFeaturesService.createFinancialContribution(clubId, user?.id || null, dto);
  }

  @Get('financial-contributions')
  @ApiOperation({ summary: 'Get financial contributions' })
  @ApiQuery({ name: 'fundraisingId', required: false })
  async getFinancialContributions(
    @Param('clubId') clubId: string,
    @Query('fundraisingId') fundraisingId?: string,
  ) {
    return this.clubFeaturesService.getFinancialContributions(clubId, fundraisingId);
  }

  @Get('financial-contributions/summary')
  @ApiOperation({ summary: 'Get contribution summary (transparent summary)' })
  async getContributionSummary(@Param('clubId') clubId: string) {
    return this.clubFeaturesService.getContributionSummary(clubId);
  }

  // ==================== REPORTS ====================

  @Post('reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a report (club admin only)' })
  async createReport(
    @CurrentUser() user: any,
    @Param('clubId') clubId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.clubFeaturesService.createReport(clubId, user.id, dto);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get club reports' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean })
  async getReports(
    @Param('clubId') clubId: string,
    @Query('type') type?: string,
    @Query('isPublic') isPublic?: boolean,
  ) {
    return this.clubFeaturesService.getReports(clubId, type, isPublic);
  }

  @Get('reports/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a simple report' })
  @ApiQuery({ name: 'type', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async generateSimpleReport(
    @Param('clubId') clubId: string,
    @Query('type') type: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.clubFeaturesService.generateSimpleReport(
      clubId,
      type,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}

