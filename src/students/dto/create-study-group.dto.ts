import { IsEnum, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { EducationLevel } from '@prisma/client';

export class CreateStudyGroupDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  subject: string;

  @IsEnum(EducationLevel)
  level: EducationLevel;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(50)
  maxMembers?: number;
}

