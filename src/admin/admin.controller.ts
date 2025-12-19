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
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permission } from '../common/permissions/permissions.constant';
import { UserRole } from '@prisma/client';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Get system statistics' })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  async getStatistics() {
    return this.adminService.getStatistics();
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get trend data for charts' })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  async getTrendData(@Query('days') days?: string) {
    return this.adminService.getTrendData(days ? parseInt(days) : 30);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent activity feed' })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  async getRecentActivity(@Query('limit') limit?: string) {
    return this.adminService.getRecentActivity(limit ? parseInt(limit) : 20);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users (paginated)' })
  @RequirePermissions(Permission.VIEW_USERS)
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.adminService.getAllUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      role,
      status,
      sortBy || 'createdAt',
      sortOrder || 'desc',
    );
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a new user' })
  @RequirePermissions(Permission.VIEW_USERS)
  async createUser(
    @CurrentUser() admin: any,
    @Body() createUserDto: CreateUserDto,
  ) {
    const isSuperAdmin = admin.role === UserRole.SUPER_ADMIN;
    return this.adminService.createUser(createUserDto, admin.id, isSuperAdmin);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user' })
  @Roles(UserRole.ADMIN)
  async updateUser(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.adminService.updateUser(id, data, admin.id);
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  @RequirePermissions(Permission.ASSIGN_ROLES)
  async updateUserRole(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body('role') role: UserRole,
  ) {
    return this.adminService.updateUserRole(id, role, admin.id);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all available roles and their permissions' })
  async getRoles() {
    return this.adminService.getRoles();
  }

  @Get('roles/:role/permissions')
  @ApiOperation({ summary: 'Get permissions for a specific role' })
  async getRolePermissions(@Param('role') role: UserRole) {
    return this.adminService.getRolePermissions(role);
  }

  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user' })
  @RequirePermissions(Permission.SUSPEND_USERS)
  async suspendUser(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() body: { reason?: string; duration?: number },
  ) {
    return this.adminService.suspendUser(id, body.reason, body.duration, admin.id);
  }

  @Post('users/:id/ban')
  @ApiOperation({ summary: 'Permanently ban a user' })
  @RequirePermissions(Permission.SUSPEND_USERS)
  async banUser(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.banUser(id, reason, admin.id);
  }

  @Post('users/:id/activate')
  @ApiOperation({ summary: 'Activate a suspended user' })
  @RequirePermissions(Permission.SUSPEND_USERS)
  async activateUser(
    @CurrentUser() admin: any,
    @Param('id') id: string,
  ) {
    return this.adminService.activateUser(id, admin.id);
  }

  @Post('users/:id/message')
  @ApiOperation({ summary: 'Send a message to a user' })
  @RequirePermissions(Permission.SEND_BROADCASTS)
  async sendMessageToUser(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body('message') message: string,
  ) {
    return this.adminService.sendMessageToUser(id, message, admin.id);
  }

  @Get('users/:id/export')
  @ApiOperation({ summary: 'Export user data' })
  @RequirePermissions(Permission.EXPORT_DATA)
  async exportUserData(@Param('id') id: string, @Res() res: Response) {
    const csv = await this.adminService.exportUserData(id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=user-${id}-${Date.now()}.csv`);
    return res.send(csv);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get all audit logs' })
  @RequirePermissions(Permission.VIEW_USERS)
  async getAllAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('adminId') adminId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = {};
    if (adminId) filters.adminId = adminId;
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (entity) filters.entity = entity;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.adminService.getAllAuditLogs(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      filters,
    );
  }

  @Get('users/:id/audit-logs')
  @ApiOperation({ summary: 'Get audit logs for a user' })
  @RequirePermissions(Permission.VIEW_USERS)
  async getUserAuditLogs(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAuditLogs(
      id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user' })
  @Roles(UserRole.ADMIN)
  async deleteUser(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.deleteUser(id, admin.id);
  }

  @Get('clubs')
  @ApiOperation({ summary: 'Get all clubs (paginated)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'ACTIVE', 'PILOT', 'FROZEN', 'ARCHIVED'] })
  async getAllClubs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllClubs(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status as any,
    );
  }

  @Put('clubs/:id')
  @ApiOperation({ summary: 'Update club' })
  async updateClub(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateClub(id, data);
  }

  @Delete('clubs/:id')
  @ApiOperation({ summary: 'Delete club' })
  @Roles(UserRole.ADMIN)
  async deleteClub(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.deleteClub(id, admin.id);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get all events (paginated)' })
  async getAllEvents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllEvents(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Put('events/:id')
  @ApiOperation({ summary: 'Update event' })
  async updateEvent(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateEvent(id, data);
  }

  @Delete('events/:id')
  @ApiOperation({ summary: 'Delete event' })
  @Roles(UserRole.ADMIN)
  async deleteEvent(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.deleteEvent(id, admin.id);
  }

  @Get('badges')
  @ApiOperation({ summary: 'Get all badges' })
  async getAllBadges() {
    return this.adminService.getAllBadges();
  }

  @Post('badges')
  @ApiOperation({ summary: 'Create badge' })
  @Roles(UserRole.ADMIN)
  async createBadge(@Body() data: any) {
    return this.adminService.createBadge(data);
  }

  @Put('badges/:id')
  @ApiOperation({ summary: 'Update badge' })
  @Roles(UserRole.ADMIN)
  async updateBadge(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateBadge(id, data);
  }

  @Delete('badges/:id')
  @ApiOperation({ summary: 'Delete badge' })
  @Roles(UserRole.ADMIN)
  async deleteBadge(@Param('id') id: string) {
    return this.adminService.deleteBadge(id);
  }

  // Mentorship Management
  @Get('mentorships')
  @ApiOperation({ summary: 'Get all mentorships (paginated)' })
  async getAllMentorships(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllMentorships(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
    );
  }

  @Get('mentorships/:id')
  @ApiOperation({ summary: 'Get mentorship by ID' })
  async getMentorshipById(@Param('id') id: string) {
    return this.adminService.getMentorshipById(id);
  }

  @Put('mentorships/:id')
  @ApiOperation({ summary: 'Update mentorship' })
  async updateMentorship(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateMentorship(id, data);
  }

  @Post('mentorships/:id/certificate')
  @RequirePermissions(Permission.MANAGE_MENTORSHIP)
  @ApiOperation({ summary: 'Generate certificate for completed mentorship' })
  async generateCertificate(@Param('id') id: string) {
    return this.adminService.generateCertificate(id);
  }

  // ==================== MENTORSHIP AUTOMATION ====================

  // Cycle Management
  @Post('mentorship/cycles')
  @RequirePermissions(Permission.MANAGE_MENTORSHIP)
  @ApiOperation({ summary: 'Create a new mentorship cycle' })
  async createMentorshipCycle(@Body() data: any) {
    return this.adminService.createMentorshipCycle(data);
  }

  @Get('mentorship/cycles')
  @RequirePermissions(Permission.MANAGE_MENTORSHIP)
  @ApiOperation({ summary: 'Get all mentorship cycles' })
  async getAllMentorshipCycles() {
    return this.adminService.getAllMentorshipCycles();
  }

  @Get('mentorship/cycles/:id')
  @RequirePermissions(Permission.MANAGE_MENTORSHIP)
  @ApiOperation({ summary: 'Get mentorship cycle by ID' })
  async getMentorshipCycleById(@Param('id') id: string) {
    return this.adminService.getMentorshipCycleById(id);
  }

  @Get('mentorship/available')
  @RequirePermissions(Permission.MANAGE_MENTORSHIP)
  @ApiOperation({ summary: 'Get all available mentors and mentees for assignment' })
  @ApiQuery({ name: 'cycleId', required: false, description: 'Optional cycle ID to include interested users' })
  async getAvailableMentorsAndMentees(@Query('cycleId') cycleId?: string) {
    return this.adminService.getAvailableMentorsAndMentees(cycleId);
  }

  @Post('mentorship/cycles/:id/assign')
  @RequirePermissions(Permission.MANAGE_MENTORSHIP)
  @ApiOperation({ summary: 'Manually assign a mentor+mentee to a cycle (creates mentorship + program)' })
  async manualAssignMentorship(
    @Param('id') cycleId: string,
    @Body() body: { mentorId: string; menteeId: string },
  ) {
    return this.adminService.manualAssignMentorshipToCycle(cycleId, body.mentorId, body.menteeId);
  }

  @Post('mentorship/cycles/:id/launch')
  @RequirePermissions(Permission.MANAGE_MENTORSHIP)
  @ApiOperation({ summary: 'Launch a mentorship cycle (activate and notify participants)' })
  async launchMentorshipCycle(
    @Param('id') cycleId: string,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.launchMentorshipCycle(cycleId, admin.id);
  }

  // Program Announcements
  @Post('mentorship/announcements')
  @RequirePermissions(Permission.MANAGE_MENTORSHIP)
  @ApiOperation({ summary: 'Create and send program announcement' })
  async createProgramAnnouncement(@Body() data: any) {
    return this.adminService.createProgramAnnouncement(data);
  }

  // Automated Matching
  @Post('mentorship/cycles/:id/match')
  @RequirePermissions(Permission.MANAGE_MENTORSHIP)
  @ApiOperation({ summary: 'Run automated matching for a cycle' })
  async runAutomatedMatching(
    @Param('id') cycleId: string,
    @Query('minScore') minScore?: string,
    @Query('autoApprove') autoApprove?: string,
  ) {
    return this.adminService.runAutomatedMatching(
      cycleId,
      minScore ? parseFloat(minScore) : 70,
      autoApprove === 'true',
    );
  }

  @Post('mentorship/matches/approve')
  @RequirePermissions(Permission.MANAGE_MENTORSHIP)
  @ApiOperation({ summary: 'Approve multiple matches (bulk approval)' })
  async approveMatches(@Body() data: { matchIds: string[] }) {
    return this.adminService.approveMatches(data.matchIds);
  }

  // Onboarding Workflows
  @Post('mentorship/onboarding/send')
  @RequirePermissions(Permission.MANAGE_MENTORSHIP)
  @ApiOperation({ summary: 'Send onboarding notifications to mentors or mentees' })
  async sendOnboardingNotifications(
    @Body() data: { targetRole: 'MENTOR' | 'MENTEE'; cycleId?: string },
  ) {
    return this.adminService.sendOnboardingNotifications(data.targetRole, data.cycleId);
  }

  // Progress Tracking
  @Get('mentorship/progress')
  @RequirePermissions(Permission.MANAGE_MENTORSHIP)
  @ApiOperation({ summary: 'Get mentorship progress statistics' })
  async getMentorshipProgress(@Query('cycleId') cycleId?: string) {
    return this.adminService.getMentorshipProgress(cycleId);
  }

  // Analytics
  @Get('mentorship/analytics')
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({ summary: 'Get comprehensive mentorship analytics' })
  async getMentorshipAnalytics(@Query('cycleId') cycleId?: string) {
    return this.adminService.getMentorshipAnalytics(cycleId);
  }

  // Notification Management
  @Get('notifications')
  @ApiOperation({ summary: 'Get all notifications (paginated)' })
  async getAllNotifications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.adminService.getAllNotifications(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      type,
      unreadOnly === 'true',
    );
  }

  @Post('notifications')
  @ApiOperation({ summary: 'Create notification for a user' })
  @Roles(UserRole.ADMIN)
  async createNotification(@Body() data: any) {
    return this.adminService.createNotification(data);
  }

  @Post('notifications/system')
  @ApiOperation({ summary: 'Send system-wide notification to all users' })
  @Roles(UserRole.ADMIN)
  async sendSystemNotification(@Body() data: any) {
    return this.adminService.sendSystemNotification(data);
  }

  // Mentor Management
  @Get('mentors')
  @ApiOperation({ summary: 'Get all mentor profiles' })
  async getAllMentors() {
    return this.adminService.getAllMentors();
  }

  @Get('mentors/:id')
  @ApiOperation({ summary: 'Get mentor profile by user ID' })
  async getMentorById(@Param('id') id: string) {
    return this.adminService.getMentorById(id);
  }

  @Put('mentors/:id/verify')
  @ApiOperation({ summary: 'Verify or unverify a mentor' })
  @Roles(UserRole.ADMIN)
  async verifyMentor(@Param('id') id: string, @Body('isVerified') isVerified: boolean) {
    return this.adminService.verifyMentor(id, isVerified);
  }

  // Mentee Management
  @Get('mentees')
  @ApiOperation({ summary: 'Get all mentee profiles' })
  async getAllMentees() {
    return this.adminService.getAllMentees();
  }

  @Get('mentees/:id')
  @ApiOperation({ summary: 'Get mentee profile by user ID' })
  async getMenteeById(@Param('id') id: string) {
    return this.adminService.getMenteeById(id);
  }

  // Club Manager Management
  @Get('club-managers')
  @ApiOperation({ summary: 'Get all club managers' })
  async getAllClubManagers() {
    return this.adminService.getAllClubManagers();
  }

  // Messages Management
  @Get('messages')
  @ApiOperation({ summary: 'Get all messages (admin view)' })
  @RequirePermissions(Permission.MODERATE_CHATS)
  async getAllMessages(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('senderId') senderId?: string,
    @Query('receiverId') receiverId?: string,
  ) {
    return this.adminService.getAllMessages(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      search,
      senderId,
      receiverId,
    );
  }

  @Get('messages/stats')
  @ApiOperation({ summary: 'Get message statistics' })
  @RequirePermissions(Permission.MODERATE_CHATS)
  async getMessageStats() {
    return this.adminService.getMessageStats();
  }

  @Get('users/:id/messages')
  @ApiOperation({ summary: 'Get messages for a specific user' })
  @RequirePermissions(Permission.MODERATE_CHATS)
  async getUserMessages(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getMessagesByUser(
      id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message' })
  @RequirePermissions(Permission.MODERATE_CHATS)
  async deleteMessage(@Param('id') id: string) {
    return this.adminService.deleteMessage(id);
  }

  // Posts Management
  @Get('posts')
  @ApiOperation({ summary: 'Get all posts (admin view)' })
  @RequirePermissions(Permission.MODERATE_POSTS)
  async getAllPosts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('userId') userId?: string,
    @Query('clubId') clubId?: string,
    @Query('isDeleted') isDeleted?: string,
    @Query('isHidden') isHidden?: string,
  ) {
    return this.adminService.getAllPosts(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      search,
      userId,
      clubId,
      isDeleted === 'true' ? true : isDeleted === 'false' ? false : undefined,
      isHidden === 'true' ? true : isHidden === 'false' ? false : undefined,
    );
  }

  @Get('posts/stats')
  @ApiOperation({ summary: 'Get post statistics' })
  @RequirePermissions(Permission.MODERATE_POSTS)
  async getPostStats() {
    return this.adminService.getPostStats();
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Delete a post (soft delete)' })
  @RequirePermissions(Permission.MODERATE_POSTS)
  async deletePost(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.deletePost(id, admin.id);
  }

  @Put('posts/:id/hide')
  @ApiOperation({ summary: 'Hide a post' })
  @RequirePermissions(Permission.MODERATE_POSTS)
  async hidePost(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.hidePost(id, admin.id);
  }

  @Put('posts/:id/unhide')
  @ApiOperation({ summary: 'Unhide a post' })
  @RequirePermissions(Permission.MODERATE_POSTS)
  async unhidePost(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.unhidePost(id, admin.id);
  }

  @Put('posts/:id/restore')
  @ApiOperation({ summary: 'Restore a deleted post' })
  @RequirePermissions(Permission.MODERATE_POSTS)
  async restorePost(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.restorePost(id, admin.id);
  }

  @Delete('posts/:id/permanent')
  @ApiOperation({ summary: 'Permanently delete a post' })
  @RequirePermissions(Permission.MODERATE_POSTS)
  async permanentlyDeletePost(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.permanentlyDeletePost(id, admin.id);
  }

  // ==================== STUDENT MANAGEMENT ====================

  @Get('students')
  @ApiOperation({ summary: 'Get all students' })
  @RequirePermissions(Permission.VIEW_USERS)
  async getAllStudents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('educationLevel') educationLevel?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.adminService.getAllStudents(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      educationLevel,
      sortBy,
      sortOrder,
    );
  }

  @Get('students/:id')
  @ApiOperation({ summary: 'Get student by ID' })
  @RequirePermissions(Permission.VIEW_USERS)
  async getStudentById(@Param('id') id: string) {
    return this.adminService.getStudentById(id);
  }

  @Get('students/stats')
  @ApiOperation({ summary: 'Get student statistics' })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  async getStudentStats() {
    return this.adminService.getStudentStats();
  }

  // Scholarships Management
  @Get('scholarships')
  @ApiOperation({ summary: 'Get all scholarships' })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  async getAllScholarships(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('level') level?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminService.getAllScholarships(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      level,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    );
  }

  @Post('scholarships')
  @ApiOperation({ summary: 'Create a scholarship' })
  @RequirePermissions(Permission.CREATE_CONTENT)
  async createScholarship(@Body() data: any) {
    return this.adminService.createScholarship({
      ...data,
      deadline: new Date(data.deadline),
    });
  }

  @Put('scholarships/:id')
  @ApiOperation({ summary: 'Update a scholarship' })
  @RequirePermissions(Permission.CREATE_CONTENT)
  async updateScholarship(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateScholarship(id, {
      ...data,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
    });
  }

  @Delete('scholarships/:id')
  @ApiOperation({ summary: 'Delete a scholarship' })
  @RequirePermissions(Permission.CREATE_CONTENT)
  async deleteScholarship(@Param('id') id: string) {
    return this.adminService.deleteScholarship(id);
  }

  @Get('scholarships/applications')
  @ApiOperation({ summary: 'Get scholarship applications' })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  async getScholarshipApplications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('scholarshipId') scholarshipId?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getScholarshipApplications(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      scholarshipId,
      status,
    );
  }

  @Put('scholarships/applications/:id/status')
  @ApiOperation({ summary: 'Update application status' })
  @RequirePermissions(Permission.MANAGE_USERS)
  async updateApplicationStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminService.updateApplicationStatus(id, status);
  }

  // Study Groups Management
  @Get('study-groups')
  @ApiOperation({ summary: 'Get all study groups' })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  async getAllStudyGroups(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('level') level?: string,
    @Query('subject') subject?: string,
  ) {
    return this.adminService.getAllStudyGroups(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      level,
      subject,
    );
  }

  @Delete('study-groups/:id')
  @ApiOperation({ summary: 'Delete a study group' })
  @RequirePermissions(Permission.MANAGE_CLUBS)
  async deleteStudyGroup(@Param('id') id: string) {
    return this.adminService.deleteStudyGroup(id);
  }

  // Academic Resources Management
  // IMPORTANT: More specific routes (with :id) must come BEFORE general routes
  @Get('resources/:id')
  @ApiOperation({ summary: 'Get an academic resource by ID' })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  async getResourceById(@Param('id') id: string) {
    return this.adminService.getResourceById(id);
  }

  @Get('resources')
  @ApiOperation({ summary: 'Get all academic resources' })
  @RequirePermissions(Permission.VIEW_ANALYTICS)
  async getAllResources(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('level') level?: string,
    @Query('subject') subject?: string,
  ) {
    return this.adminService.getAllResources(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      type,
      level,
      subject,
    );
  }

  @Post('resources')
  @ApiOperation({ summary: 'Create an academic resource' })
  @RequirePermissions(Permission.CREATE_CONTENT)
  async createResource(@Body() data: any) {
    return this.adminService.createResource(data);
  }

  @Put('resources/:id')
  @ApiOperation({ summary: 'Update an academic resource' })
  @RequirePermissions(Permission.CREATE_CONTENT)
  async updateResource(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateResource(id, data);
  }

  @Delete('resources/:id')
  @ApiOperation({ summary: 'Delete an academic resource' })
  @RequirePermissions(Permission.CREATE_CONTENT)
  async deleteResource(@Param('id') id: string) {
    return this.adminService.deleteResource(id);
  }

  // File Upload Endpoint - redirects to main upload controller
  @Post('upload')
  @ApiOperation({ summary: 'Upload a file (admin)' })
  @RequirePermissions(Permission.CREATE_CONTENT)
  async uploadFile(@Body() body: any) {
    // This endpoint is kept for backward compatibility
    // Actual uploads should use /upload/file or /upload/resource
    return {
      message: 'Use /upload/file for general files or /upload/resource for academic resources',
      endpoints: {
        image: '/upload/image',
        images: '/upload/images',
        file: '/upload/file',
        resource: '/upload/resource',
      },
    };
  }
}

