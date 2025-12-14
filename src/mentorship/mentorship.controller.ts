import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MentorshipService } from './mentorship.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestMentorshipDto } from './dto/request-mentorship.dto';
import { ApplyMentorDto } from './dto/apply-mentor.dto';
import { CreateMentorProfileDto } from './dto/create-mentor-profile.dto';
import { CreateMenteeProfileDto } from './dto/create-mentee-profile.dto';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { TaskStatus, EvaluationType } from '@prisma/client';

@ApiTags('mentorship')
@Controller('mentorship')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MentorshipController {
  constructor(private readonly mentorshipService: MentorshipService) {}

  // ==================== MENTOR PROFILE ====================

  @Post('mentor/profile')
  @ApiOperation({ summary: 'Create mentor profile' })
  async createMentorProfile(
    @CurrentUser() user: any,
    @Body() dto: CreateMentorProfileDto,
  ) {
    return this.mentorshipService.createMentorProfile(user.id, dto);
  }

  @Get('mentor/profile')
  @ApiOperation({ summary: 'Get mentor profile' })
  async getMentorProfile(@CurrentUser() user: any) {
    return this.mentorshipService.getMentorProfile(user.id);
  }

  @Put('mentor/profile')
  @ApiOperation({ summary: 'Update mentor profile' })
  async updateMentorProfile(
    @CurrentUser() user: any,
    @Body() dto: Partial<CreateMentorProfileDto>,
  ) {
    return this.mentorshipService.updateMentorProfile(user.id, dto);
  }

  // ==================== MENTEE PROFILE ====================

  @Post('mentee/profile')
  @ApiOperation({ summary: 'Create mentee profile' })
  async createMenteeProfile(
    @CurrentUser() user: any,
    @Body() dto: CreateMenteeProfileDto,
  ) {
    return this.mentorshipService.createMenteeProfile(user.id, dto);
  }

  @Get('mentee/profile')
  @ApiOperation({ summary: 'Get mentee profile' })
  async getMenteeProfile(@CurrentUser() user: any) {
    return this.mentorshipService.getMenteeProfile(user.id);
  }

  @Put('mentee/profile')
  @ApiOperation({ summary: 'Update mentee profile' })
  async updateMenteeProfile(
    @CurrentUser() user: any,
    @Body() dto: Partial<CreateMenteeProfileDto>,
  ) {
    return this.mentorshipService.updateMenteeProfile(user.id, dto);
  }

  // ==================== CYCLES ====================

  @Post('cycles')
  @ApiOperation({ summary: 'Create mentorship cycle (Admin only)' })
  async createCycle(@Body() dto: CreateCycleDto) {
    return this.mentorshipService.createCycle(dto);
  }

  @Get('cycles')
  @ApiOperation({ summary: 'Get all cycles' })
  async getCycles() {
    return this.mentorshipService.getCycles();
  }

  @Get('cycles/:id')
  @ApiOperation({ summary: 'Get cycle by ID' })
  async getCycleById(@Param('id') id: string) {
    return this.mentorshipService.getCycleById(id);
  }

  // ==================== MATCHING ====================

  @Get('matches')
  @ApiOperation({ summary: 'Find mentorship matches for current user' })
  @ApiQuery({ name: 'cycleId', required: false })
  @ApiQuery({ name: 'minScore', required: false, type: Number })
  async findMatches(
    @CurrentUser() user: any,
    @Query('cycleId') cycleId?: string,
    @Query('minScore') minScore?: string,
  ) {
    return this.mentorshipService.findMatches(
      user.id,
      cycleId,
      minScore ? parseInt(minScore) : 70,
    );
  }

  @Post('matches/:id/approve')
  @ApiOperation({ summary: 'Approve a match' })
  async approveMatch(
    @CurrentUser() user: any,
    @Param('id') matchId: string,
    @Body('isMentor') isMentor: boolean,
  ) {
    return this.mentorshipService.approveMatch(matchId, user.id, isMentor);
  }

  // ==================== PROGRAMS ====================

  @Get('programs/:mentorshipId/:cycleId')
  @ApiOperation({ summary: 'Get mentorship program' })
  async getProgram(
    @Param('mentorshipId') mentorshipId: string,
    @Param('cycleId') cycleId: string,
  ) {
    return this.mentorshipService.getProgram(mentorshipId, cycleId);
  }

  // ==================== TASKS ====================

  @Get('tasks/:mentorshipId')
  @ApiOperation({ summary: 'Get tasks for mentorship' })
  @ApiQuery({ name: 'week', required: false, type: Number })
  async getTasks(
    @Param('mentorshipId') mentorshipId: string,
    @Query('week') week?: string,
  ) {
    return this.mentorshipService.getTasks(
      mentorshipId,
      week ? parseInt(week) : undefined,
    );
  }

  @Put('tasks/:id/status')
  @ApiOperation({ summary: 'Update task status' })
  async updateTaskStatus(
    @Param('id') taskId: string,
    @Body('status') status: TaskStatus,
    @Body('mentorFeedback') mentorFeedback?: string,
  ) {
    return this.mentorshipService.updateTaskStatus(taskId, status, mentorFeedback);
  }

  // ==================== PROGRESS ====================

  @Put('progress/:mentorshipId/:programId/:week')
  @ApiOperation({ summary: 'Update progress for a week' })
  async updateProgress(
    @Param('mentorshipId') mentorshipId: string,
    @Param('programId') programId: string,
    @Param('week') week: string,
    @Body() data: any,
  ) {
    return this.mentorshipService.updateProgress(
      mentorshipId,
      programId,
      parseInt(week),
      data,
    );
  }

  @Get('progress/:mentorshipId')
  @ApiOperation({ summary: 'Get progress for mentorship' })
  async getProgress(@Param('mentorshipId') mentorshipId: string) {
    return this.mentorshipService.getProgress(mentorshipId);
  }

  // ==================== EVALUATIONS ====================

  @Post('evaluations/:mentorshipId/:programId')
  @ApiOperation({ summary: 'Submit evaluation' })
  async submitEvaluation(
    @CurrentUser() user: any,
    @Param('mentorshipId') mentorshipId: string,
    @Param('programId') programId: string,
    @Body('type') type: EvaluationType,
    @Body() data: any,
  ) {
    return this.mentorshipService.submitEvaluation(
      mentorshipId,
      programId,
      user.id,
      type,
      data,
    );
  }

  @Get('evaluations/:mentorshipId')
  @ApiOperation({ summary: 'Get evaluations for mentorship' })
  async getEvaluations(@Param('mentorshipId') mentorshipId: string) {
    return this.mentorshipService.getEvaluations(mentorshipId);
  }

  // ==================== CERTIFICATES ====================

  @Post('certificates/:mentorshipId')
  @ApiOperation({ summary: 'Generate certificate for completed mentorship' })
  async generateCertificate(@Param('mentorshipId') mentorshipId: string) {
    return this.mentorshipService.generateCertificate(mentorshipId);
  }

  // ==================== LEGACY ENDPOINTS ====================

  @Get()
  @ApiOperation({ summary: 'Get all mentorship sessions for current user' })
  async findAll(@CurrentUser() user: any, @Query() filters: any) {
    return this.mentorshipService.findAll({
      ...filters,
      userId: user.id,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get mentorship by ID' })
  async findOne(@Param('id') id: string) {
    return this.mentorshipService.findOne(id);
  }

  @Get('mentors')
  @ApiOperation({ summary: 'Get available mentors' })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getMentors(@Query('search') search?: string) {
    return this.mentorshipService.getMentors(search);
  }

  @Post('request')
  @ApiOperation({ summary: 'Request mentorship' })
  async requestMentorship(
    @CurrentUser() user: any,
    @Body() dto: RequestMentorshipDto,
  ) {
    return this.mentorshipService.requestMentorship(user.id, dto.mentorId, dto.goals);
  }

  @Post('apply')
  @ApiOperation({ summary: 'Apply to become a mentor' })
  async applyMentor(@CurrentUser() user: any, @Body() dto: ApplyMentorDto) {
    return this.mentorshipService.applyMentor(user.id, dto);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept mentorship request' })
  async acceptMentorship(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mentorshipService.acceptMentorship(user.id, id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete mentorship' })
  async completeMentorship(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mentorshipService.completeMentorship(user.id, id);
  }
}
