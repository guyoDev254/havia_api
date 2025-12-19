import { IsEnum, IsString, IsOptional, IsNumber, IsArray, IsDateString } from 'class-validator';
import { EducationLevel } from '@prisma/client';

export class CreateStudentProfileDto {
  @IsEnum(EducationLevel)
  educationLevel: EducationLevel;

  @IsString()
  schoolName: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsNumber()
  yearOfStudy?: number;

  @IsOptional()
  @IsString()
  major?: string;

  @IsOptional()
  @IsDateString()
  expectedGraduation?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsNumber()
  gpa?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievements?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extracurriculars?: string[];

  @IsOptional()
  @IsString()
  careerGoals?: string;
}

