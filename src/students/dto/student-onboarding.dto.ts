import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { EducationLevel } from '@prisma/client';

export class StudentOnboardingDto {
  @IsBoolean()
  isStudent: boolean;

  @IsOptional()
  @IsEnum(EducationLevel)
  educationLevel?: EducationLevel;

  @IsOptional()
  @IsString()
  county?: string;

  @IsOptional()
  @IsString()
  town?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  schoolName?: string;
}


