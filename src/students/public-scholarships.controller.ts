import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EducationLevel } from '@prisma/client';
import { StudentsService } from './students.service';

@ApiTags('public')
@Controller('public/scholarships')
export class PublicScholarshipsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get scholarships for website (public, no auth)' })
  async getScholarships(
    @Query('level') level?: EducationLevel,
    @Query('isActive') isActive?: string,
  ) {
    return this.studentsService.getScholarships(
      level,
      isActive !== 'false',
      'web',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scholarship by ID (public, no auth)' })
  async getScholarshipById(@Param('id') id: string) {
    const scholarship = await this.studentsService.getScholarshipById(id);
    if (scholarship.visibility !== 'web' && scholarship.visibility !== 'both') {
      throw new NotFoundException('Scholarship not found');
    }
    return scholarship;
  }
}
