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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Get system statistics' })
  @Roles(UserRole.ADMIN)
  async getStatistics() {
    return this.adminService.getStatistics();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users (paginated)' })
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user' })
  @Roles(UserRole.ADMIN)
  async updateUser(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateUser(id, data);
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  @Roles(UserRole.ADMIN)
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
  ) {
    return this.adminService.updateUserRole(id, role);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user' })
  @Roles(UserRole.ADMIN)
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('clubs')
  @ApiOperation({ summary: 'Get all clubs (paginated)' })
  async getAllClubs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllClubs(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
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
  async deleteClub(@Param('id') id: string) {
    return this.adminService.deleteClub(id);
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
  async deleteEvent(@Param('id') id: string) {
    return this.adminService.deleteEvent(id);
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
}

