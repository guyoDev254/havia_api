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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { CreateStudyGroupDto } from './dto/create-study-group.dto';
import { StudentOnboardingDto } from './dto/student-onboarding.dto';
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

  @Get('study-groups/my-groups')
  @ApiOperation({ summary: 'Get my study groups' })
  async getMyStudyGroups(@CurrentUser() user: any) {
    return this.studentsService.getMyStudyGroups(user.id);
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
}

