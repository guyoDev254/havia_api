import { IsString, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseStatus, Semester } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty()
  @IsString()
  courseCode: string;

  @ApiProperty()
  @IsString()
  courseName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  credits?: number;

  @ApiPropertyOptional({ enum: Semester })
  @IsOptional()
  @IsEnum(Semester)
  semester?: Semester;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ enum: CourseStatus, default: CourseStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateCourseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  credits?: number;

  @ApiPropertyOptional({ enum: Semester })
  @IsOptional()
  @IsEnum(Semester)
  semester?: Semester;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ enum: CourseStatus })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  finalGrade?: number;
}

