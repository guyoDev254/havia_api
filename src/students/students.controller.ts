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
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { CreateStudyGroupDto } from './dto/create-study-group.dto';
import { UpdateStudyGroupDto } from './dto/update-study-group.dto';
import { CreateStudyGroupPostDto } from './dto/create-study-group-post.dto';
import { CreateStudyGroupMeetupDto } from './dto/create-study-group-meetup.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { StudentOnboardingDto } from './dto/student-onboarding.dto';
import { CreateStudentGoalDto, UpdateStudentGoalDto } from './dto/create-student-goal.dto';
import { CreateCourseDto, UpdateCourseDto } from './dto/create-course.dto';
import { CreateCourseGradeDto, UpdateCourseGradeDto } from './dto/create-course-grade.dto';
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto/create-assignment.dto';
import { CreateAcademicCalendarDto, UpdateAcademicCalendarDto } from './dto/create-academic-calendar.dto';
import { CreateStudySessionDto, UpdateStudySessionDto } from './dto/create-study-session.dto';
import { EducationLevel, ResourceType } from '@prisma/client';

@ApiTags('students')
@Controller('students')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // Student Onboarding (step-based)
  @Post('onboarding')
  @ApiOperation({ summary: 'Save student onboarding answers (student choice, education level, location, interests)' })
  async saveOnboarding(@CurrentUser() user: any, @Body() dto: StudentOnboardingDto) {
    return this.studentsService.saveOnboarding(user.id, dto);
  }

  // Student Profile
  @Post('profile')
  @ApiOperation({ summary: 'Create or update student profile' })
  async createOrUpdateProfile(
    @CurrentUser() user: any,
    @Body() dto: CreateStudentProfileDto,
  ) {
    return this.studentsService.createOrUpdateProfile(user.id, {
      ...dto,
      expectedGraduation: dto.expectedGraduation ? new Date(dto.expectedGraduation) : undefined,
    });
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user student profile' })
  async getProfile(@CurrentUser() user: any) {
    return this.studentsService.getProfile(user.id);
  }

  // Scholarships
  @Get('scholarships')
  @ApiOperation({ summary: 'Get available scholarships' })
  async getScholarships(
    @Query('level') level?: EducationLevel,
    @Query('isActive') isActive?: string,
  ) {
    return this.studentsService.getScholarships(
      level,
      isActive !== 'false',
    );
  }

  @Get('scholarships/:id')
  @ApiOperation({ summary: 'Get scholarship by ID' })
  async getScholarshipById(@Param('id') id: string) {
    return this.studentsService.getScholarshipById(id);
  }

  @Post('scholarships/:id/apply')
  @ApiOperation({ summary: 'Apply for a scholarship' })
  async applyForScholarship(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    return this.studentsService.applyForScholarship(user.id, id, notes);
  }

  @Get('scholarships/my-applications')
  @ApiOperation({ summary: 'Get my scholarship applications' })
  async getMyApplications(@CurrentUser() user: any) {
    return this.studentsService.getMyApplications(user.id);
  }

  // Study Groups
  @Get('study-groups')
  @ApiOperation({ summary: 'Get study groups' })
  async getStudyGroups(
    @Query('level') level?: EducationLevel,
    @Query('subject') subject?: string,
  ) {
    return this.studentsService.getStudyGroups(level, subject);
  }

  @Get('study-groups/:id')
  @ApiOperation({ summary: 'Get study group by ID' })
  async getStudyGroupById(@Param('id') id: string) {
    return this.studentsService.getStudyGroupById(id);
  }

  @Post('study-groups')
  @ApiOperation({ summary: 'Create a study group' })
  async createStudyGroup(
    @CurrentUser() user: any,
    @Body() dto: CreateStudyGroupDto,
  ) {
    return this.studentsService.createStudyGroup(user.id, dto);
  }

  @Post('study-groups/:id/join')
  @ApiOperation({ summary: 'Join a study group' })
  async joinStudyGroup(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.studentsService.joinStudyGroup(user.id, id);
  }

  @Post('study-groups/:id/leave')
  @ApiOperation({ summary: 'Leave a study group' })
  async leaveStudyGroup(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.studentsService.leaveStudyGroup(user.id, id);
  }

  @Delete('study-groups/:id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from study group (leader only)' })
  async removeMemberFromStudyGroup(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.studentsService.removeMemberFromStudyGroup(user.id, id, userId);
  }

  @Post('study-groups/:id/transfer-leadership')
  @ApiOperation({ summary: 'Transfer leadership to another member (leader only)' })
  async transferLeadership(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { newLeaderId: string },
  ) {
    return this.studentsService.transferLeadership(user.id, id, body.newLeaderId);
  }

  @Get('study-groups/my-groups')
  @ApiOperation({ summary: 'Get my study groups' })
  async getMyStudyGroups(@CurrentUser() user: any) {
    return this.studentsService.getMyStudyGroups(user.id);
  }

  @Put('study-groups/:id')
  @ApiOperation({ summary: 'Update a study group (leader only)' })
  async updateStudyGroup(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateStudyGroupDto,
  ) {
    return this.studentsService.updateStudyGroup(user.id, id, dto);
  }

  @Delete('study-groups/:id')
  @ApiOperation({ summary: 'Delete a study group (leader only)' })
  async deleteStudyGroup(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.studentsService.deleteStudyGroup(user.id, id);
  }

  // Study Group Posts
  @Post('study-groups/:id/posts')
  @ApiOperation({ summary: 'Create a post in a study group' })
  async createStudyGroupPost(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateStudyGroupPostDto,
  ) {
    return this.studentsService.createStudyGroupPost(user.id, id, dto);
  }

  @Get('study-groups/:id/posts')
  @ApiOperation({ summary: 'Get posts for a study group' })
  async getStudyGroupPosts(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.studentsService.getStudyGroupPosts(
      id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      user?.id,
    );
  }

  @Put('study-groups/posts/:postId')
  @ApiOperation({ summary: 'Update a study group post' })
  async updateStudyGroupPost(
    @CurrentUser() user: any,
    @Param('postId') postId: string,
    @Body() dto: CreateStudyGroupPostDto,
  ) {
    return this.studentsService.updateStudyGroupPost(user.id, postId, dto);
  }

  @Delete('study-groups/posts/:postId')
  @ApiOperation({ summary: 'Delete a study group post' })
  async deleteStudyGroupPost(
    @CurrentUser() user: any,
    @Param('postId') postId: string,
  ) {
    return this.studentsService.deleteStudyGroupPost(user.id, postId);
  }

  // Study Group Meetups
  @Post('study-groups/:id/meetups')
  @ApiOperation({ summary: 'Create a meetup in a study group (leader only)' })
  async createStudyGroupMeetup(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateStudyGroupMeetupDto,
  ) {
    return this.studentsService.createStudyGroupMeetup(user.id, id, {
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  @Get('study-groups/:id/meetups')
  @ApiOperation({ summary: 'Get meetups for a study group' })
  async getStudyGroupMeetups(
    @Param('id') id: string,
    @Query('includePast') includePast?: string,
  ) {
    return this.studentsService.getStudyGroupMeetups(id, includePast === 'true');
  }

  @Post('study-groups/meetups/:meetupId/rsvp')
  @ApiOperation({ summary: 'RSVP to a study group meetup' })
  async rsvpToMeetup(
    @CurrentUser() user: any,
    @Param('meetupId') meetupId: string,
    @Body() body: { status: 'ATTENDING' | 'NOT_ATTENDING' | 'MAYBE'; notes?: string },
  ) {
    return this.studentsService.rsvpToMeetup(user.id, meetupId, body.status, body.notes);
  }

  @Put('study-groups/meetups/:meetupId')
  @ApiOperation({ summary: 'Update a study group meetup (leader only)' })
  async updateStudyGroupMeetup(
    @CurrentUser() user: any,
    @Param('meetupId') meetupId: string,
    @Body() dto: CreateStudyGroupMeetupDto,
  ) {
    return this.studentsService.updateStudyGroupMeetup(user.id, meetupId, {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  @Post('study-groups/meetups/:meetupId/cancel')
  @ApiOperation({ summary: 'Cancel a meetup (leader only)' })
  async cancelMeetup(
    @CurrentUser() user: any,
    @Param('meetupId') meetupId: string,
  ) {
    return this.studentsService.cancelMeetup(user.id, meetupId);
  }

  // Study Group Post Comments
  @Post('study-groups/posts/:postId/comments')
  @ApiOperation({ summary: 'Add a comment to a study group post' })
  async addCommentToPost(
    @CurrentUser() user: any,
    @Param('postId') postId: string,
    @Body() dto: AddCommentDto,
  ) {
    return this.studentsService.addCommentToPost(user.id, postId, dto.content);
  }

  @Get('study-groups/posts/:postId/comments')
  @ApiOperation({ summary: 'Get comments for a study group post' })
  async getPostComments(
    @Param('postId') postId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.studentsService.getPostComments(
      postId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Delete('study-groups/posts/comments/:commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  async deleteComment(
    @CurrentUser() user: any,
    @Param('commentId') commentId: string,
  ) {
    return this.studentsService.deleteComment(user.id, commentId);
  }

  // Study Group Post Reactions
  @Post('study-groups/posts/:postId/react')
  @ApiOperation({ summary: 'Toggle reaction on a study group post' })
  async togglePostReaction(
    @CurrentUser() user: any,
    @Param('postId') postId: string,
    @Body() body: { type?: 'LIKE' | 'LOVE' | 'SUPPORT' | 'CELEBRATE' },
  ) {
    return this.studentsService.togglePostReaction(user.id, postId, body.type || 'LIKE');
  }

  @Get('study-groups/posts/:postId/reactions')
  @ApiOperation({ summary: 'Get reactions for a study group post' })
  async getPostReactions(@Param('postId') postId: string) {
    return this.studentsService.getPostReactions(postId);
  }

  // Academic Resources
  @Get('resources')
  @ApiOperation({ summary: 'Get academic resources' })
  async getResources(
    @Query('level') level?: EducationLevel,
    @Query('subject') subject?: string,
    @Query('type') type?: ResourceType,
  ) {
    return this.studentsService.getResources(level, subject, type);
  }

  @Get('resources/:id')
  @ApiOperation({ summary: 'Get resource by ID' })
  async getResourceById(@Param('id') id: string) {
    return this.studentsService.getResourceById(id);
  }

  // Student Dashboard (Journey overview)
  @Get('dashboard')
  @ApiOperation({ summary: 'Get student dashboard blocks (recommendations + progress snapshot)' })
  async getDashboard(@CurrentUser() user: any) {
    return this.studentsService.getDashboard(user.id);
  }

  // Student Goals
  @Get('goals')
  @ApiOperation({ summary: 'Get student goals' })
  async getGoals(@CurrentUser() user: any) {
    return this.studentsService.getGoals(user.id);
  }

  @Post('goals')
  @ApiOperation({ summary: 'Create a student goal' })
  async createGoal(
    @CurrentUser() user: any,
    @Body() dto: CreateStudentGoalDto,
  ) {
    return this.studentsService.createGoal(user.id, dto);
  }

  @Put('goals/:id')
  @ApiOperation({ summary: 'Update a student goal' })
  async updateGoal(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateStudentGoalDto,
  ) {
    return this.studentsService.updateGoal(user.id, id, dto);
  }

  @Put('goals/:id/complete')
  @ApiOperation({ summary: 'Mark a goal as completed' })
  async completeGoal(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.studentsService.updateGoal(user.id, id, {
      status: 'COMPLETED',
    });
  }

  @Put('goals/:id/cancel')
  @ApiOperation({ summary: 'Cancel a student goal' })
  async cancelGoal(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.studentsService.updateGoal(user.id, id, {
      status: 'CANCELLED',
    });
  }

  @Delete('goals/:id')
  @ApiOperation({ summary: 'Delete a student goal' })
  async deleteGoal(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.studentsService.deleteGoal(user.id, id);
  }

  // ========== COURSE MANAGEMENT ==========

  @Post('courses')
  @ApiOperation({ summary: 'Create a new course' })
  async createCourse(@CurrentUser() user: any, @Body() dto: CreateCourseDto) {
    return this.studentsService.createCourse(user.id, dto);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Get all courses for current student' })
  async getCourses(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.studentsService.getCourses(user.id, status);
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'Get course by ID' })
  async getCourseById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.studentsService.getCourseById(user.id, id);
  }

  @Put('courses/:id')
  @ApiOperation({ summary: 'Update a course' })
  async updateCourse(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.studentsService.updateCourse(user.id, id, dto);
  }

  @Delete('courses/:id')
  @ApiOperation({ summary: 'Delete a course' })
  async deleteCourse(@CurrentUser() user: any, @Param('id') id: string) {
    return this.studentsService.deleteCourse(user.id, id);
  }

  // ========== COURSE GRADES ==========

  @Post('courses/:courseId/grades')
  @ApiOperation({ summary: 'Add a grade to a course' })
  async addCourseGrade(
    @CurrentUser() user: any,
    @Param('courseId') courseId: string,
    @Body() dto: CreateCourseGradeDto,
  ) {
    return this.studentsService.addCourseGrade(user.id, courseId, dto);
  }

  @Put('courses/:courseId/grades/:gradeId')
  @ApiOperation({ summary: 'Update a course grade' })
  async updateCourseGrade(
    @CurrentUser() user: any,
    @Param('courseId') courseId: string,
    @Param('gradeId') gradeId: string,
    @Body() dto: UpdateCourseGradeDto,
  ) {
    return this.studentsService.updateCourseGrade(user.id, courseId, gradeId, dto);
  }

  @Delete('courses/:courseId/grades/:gradeId')
  @ApiOperation({ summary: 'Delete a course grade' })
  async deleteCourseGrade(
    @CurrentUser() user: any,
    @Param('courseId') courseId: string,
    @Param('gradeId') gradeId: string,
  ) {
    return this.studentsService.deleteCourseGrade(user.id, courseId, gradeId);
  }

  // ========== ASSIGNMENT MANAGEMENT ==========

  @Post('assignments')
  @ApiOperation({ summary: 'Create a new assignment' })
  async createAssignment(@CurrentUser() user: any, @Body() dto: CreateAssignmentDto) {
    return this.studentsService.createAssignment(user.id, dto);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'Get all assignments for current student' })
  async getAssignments(
    @CurrentUser() user: any,
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
  ) {
    return this.studentsService.getAssignments(user.id, courseId, status);
  }

  @Get('assignments/:id')
  @ApiOperation({ summary: 'Get assignment by ID' })
  async getAssignmentById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.studentsService.getAssignmentById(user.id, id);
  }

  @Put('assignments/:id')
  @ApiOperation({ summary: 'Update an assignment' })
  async updateAssignment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.studentsService.updateAssignment(user.id, id, dto);
  }

  @Delete('assignments/:id')
  @ApiOperation({ summary: 'Delete an assignment' })
  async deleteAssignment(@CurrentUser() user: any, @Param('id') id: string) {
    return this.studentsService.deleteAssignment(user.id, id);
  }

  // ========== ACADEMIC CALENDAR ==========

  @Post('calendar')
  @ApiOperation({ summary: 'Create a new calendar event' })
  async createCalendarEvent(@CurrentUser() user: any, @Body() dto: CreateAcademicCalendarDto) {
    return this.studentsService.createCalendarEvent(user.id, dto);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get calendar events' })
  async getCalendarEvents(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.studentsService.getCalendarEvents(user.id, startDate, endDate);
  }

  @Get('calendar/:id')
  @ApiOperation({ summary: 'Get calendar event by ID' })
  async getCalendarEventById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.studentsService.getCalendarEventById(user.id, id);
  }

  @Put('calendar/:id')
  @ApiOperation({ summary: 'Update a calendar event' })
  async updateCalendarEvent(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAcademicCalendarDto,
  ) {
    return this.studentsService.updateCalendarEvent(user.id, id, dto);
  }

  @Delete('calendar/:id')
  @ApiOperation({ summary: 'Delete a calendar event' })
  async deleteCalendarEvent(@CurrentUser() user: any, @Param('id') id: string) {
    return this.studentsService.deleteCalendarEvent(user.id, id);
  }

  // ========== STUDY SESSIONS ==========

  @Post('study-sessions')
  @ApiOperation({ summary: 'Create a new study session' })
  async createStudySession(@CurrentUser() user: any, @Body() dto: CreateStudySessionDto) {
    return this.studentsService.createStudySession(user.id, dto);
  }

  @Get('study-sessions')
  @ApiOperation({ summary: 'Get study sessions' })
  async getStudySessions(
    @CurrentUser() user: any,
    @Query('courseId') courseId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.studentsService.getStudySessions(user.id, courseId, startDate, endDate);
  }

  @Get('study-sessions/stats')
  @ApiOperation({ summary: 'Get study session statistics' })
  async getStudySessionStats(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.studentsService.getStudySessionStats(user.id, startDate, endDate);
  }

  @Put('study-sessions/:id')
  @ApiOperation({ summary: 'Update a study session' })
  async updateStudySession(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateStudySessionDto,
  ) {
    return this.studentsService.updateStudySession(user.id, id, dto);
  }

  @Delete('study-sessions/:id')
  @ApiOperation({ summary: 'Delete a study session' })
  async deleteStudySession(@CurrentUser() user: any, @Param('id') id: string) {
    return this.studentsService.deleteStudySession(user.id, id);
  }

  // ========== ANALYTICS ==========

  @Get('analytics')
  @ApiOperation({ summary: 'Get academic performance analytics' })
  async getAcademicAnalytics(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.studentsService.getAcademicAnalytics(user.id, startDate, endDate);
  }

  @Post('check-deadlines')
  @ApiOperation({ 
    summary: 'Manually trigger deadline check (normally runs automatically via cron job every hour)',
    description: 'This endpoint checks for assignments and calendar events due within 24 hours and sends notifications. It runs automatically every hour via cron job, but can be manually triggered if needed.'
  })
  async checkDeadlines() {
    return this.studentsService.checkAndNotifyUpcomingDeadlines();
  }
}

