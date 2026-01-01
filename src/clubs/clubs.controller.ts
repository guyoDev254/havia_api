import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ClubsService } from './clubs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/permissions/permissions.constant';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateClubDto } from './dto/create-club.dto';
import { AssignClubManagerDto } from './dto/assign-club-manager.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@ApiTags('clubs')
@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all clubs' })
  @ApiQuery({ name: 'category', required: false, enum: ['TECH', 'BUSINESS', 'CREATIVE', 'HEALTH', 'LEADERSHIP', 'EDUCATION', 'OTHER'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Query('category') category?: string, @Query('limit') limit?: string) {
    return this.clubsService.findAll(category as any, limit ? parseInt(limit) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get club by ID' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    // Auth is optional - allow public access but include user info if authenticated
    return this.clubsService.findOne(id, user?.id);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a club application (community-led)' })
  async createApplication(@CurrentUser() user: any, @Body() data: CreateClubDto) {
    return this.clubsService.createApplication(user.id, data);
  }

  @Post('official')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.APPROVE_CLUBS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an official NorthernBox club (admin only)' })
  async createOfficialClub(@CurrentUser() user: any, @Body() data: CreateClubDto) {
    return this.clubsService.createOfficialClub(user.id, data);
  }

  @Get('applications/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s club applications' })
  async getMyApplications(@CurrentUser() user: any) {
    return this.clubsService.getMyApplications(user.id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get club members' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getMembers(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    // Auth is optional - allow public access but include detailed info if authenticated
    return this.clubsService.getMembers(
      id,
      user?.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Get(':id/is-member')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if current user is a member' })
  async checkMembership(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clubsService.checkMembership(user.id, id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a club' })
  async joinClub(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clubsService.joinClub(user.id, id);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave a club' })
  async leaveClub(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clubsService.leaveClub(user.id, id);
  }

  @Post(':id/managers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a club manager (Admin/Moderator only)' })
  async assignManager(
    @CurrentUser() user: any,
    @Param('id') clubId: string,
    @Body() assignManagerDto: AssignClubManagerDto,
  ) {
    return this.clubsService.assignManager(clubId, assignManagerDto.userId, user.id);
  }

  @Get(':id/managers')
  @ApiOperation({ summary: 'Get all managers of a club' })
  async getManagers(@Param('id') id: string) {
    return this.clubsService.getManagers(id);
  }

  @Delete(':id/managers/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a club manager (Admin/Moderator only)' })
  async removeManager(@Param('id') clubId: string, @Param('userId') userId: string) {
    return this.clubsService.removeManager(clubId, userId);
  }

  @Get('me/managed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get clubs managed by current user' })
  async getManagedClubs(@CurrentUser() user: any) {
    return this.clubsService.getManagedClubs(user.id);
  }

  @Get('managed-by/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get clubs managed by a specific user (Admin/Moderator only)' })
  async getClubsManagedByUser(@Param('userId') userId: string) {
    return this.clubsService.getManagedClubs(userId);
  }

  @Get(':id/is-manager')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if current user is a manager of the club' })
  async isManager(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clubsService.isManager(user.id, id);
  }

  @Put(':id/members/:memberId/role')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update member role (club manager/owner only)' })
  async updateMemberRole(
    @CurrentUser() user: any,
    @Param('id') clubId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.clubsService.updateMemberRole(clubId, memberId, dto.role, user.id);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove member from club (club manager/owner only)' })
  async removeMember(
    @CurrentUser() user: any,
    @Param('id') clubId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.clubsService.removeMember(clubId, memberId, user.id);
  }

  // Admin endpoints for club management
  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.APPROVE_CLUBS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a pending club application' })
  async approveClub(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body('probationDays') probationDays?: number,
  ) {
    return this.clubsService.approveClub(id, admin.id, probationDays || 60);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.APPROVE_CLUBS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a pending club application' })
  async rejectClub(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.clubsService.rejectClub(id, admin.id, reason);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.APPROVE_CLUBS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate a pilot club to active status' })
  async activateClub(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.clubsService.activateClub(id, admin.id);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.APPROVE_CLUBS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a club' })
  async archiveClub(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.clubsService.archiveClub(id, admin.id, reason);
  }

  @Post(':id/freeze')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.APPROVE_CLUBS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Freeze a club temporarily' })
  async freezeClub(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.clubsService.freezeClub(id, admin.id);
  }

  @Post(':id/update-engagement')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update engagement score for a club' })
  async updateEngagement(@Param('id') id: string) {
    return this.clubsService.updateEngagementScore(id);
  }

  // Club-specific mentorship endpoints
  @Get(':id/mentorship')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get club mentorship sessions' })
  async getClubMentorship(@Param('id') clubId: string) {
    return this.clubsService.getClubMentorship(clubId);
  }

  @Get(':id/mentorship/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get club mentorship statistics' })
  async getClubMentorshipStats(@Param('id') clubId: string) {
    return this.clubsService.getClubMentorshipStats(clubId);
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get club analytics and insights' })
  async getClubAnalytics(@CurrentUser() user: any, @Param('id') clubId: string) {
    return this.clubsService.getClubAnalytics(clubId, user.id);
  }
}

