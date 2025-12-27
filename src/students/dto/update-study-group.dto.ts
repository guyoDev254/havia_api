import { IsEnum, IsString, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { EducationLevel } from '@prisma/client';

export class UpdateStudyGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsEnum(EducationLevel)
  level?: EducationLevel;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(50)
  maxMembers?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

