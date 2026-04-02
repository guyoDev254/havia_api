import { IsString, IsOptional, IsInt, IsArray, IsBoolean, Min, Max, IsObject } from 'class-validator';

export class CreateMenteeProfileDto {
  @IsInt()
  @IsOptional()
  @Min(13)
  @Max(100)
  age?: number;

  @IsString()
  @IsOptional()
  fieldOfInterest?: string;

  @IsString()
  @IsOptional()
  experienceLevel?: string; // Beginner, Intermediate, Advanced

  @IsString()
  @IsOptional()
  careerGoals?: string;

  @IsString()
  @IsOptional()
  challenges?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  learningPreference?: string[]; // video, chat, tasks

  @IsObject()
  @IsOptional()
  availability?: {
    days: string[];
    timeBlocks: string[];
  };

  @IsBoolean()
  @IsOptional()
  commitmentAgreed?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  goals?: string[]; // e.g. ["Get internship", "Build project"]

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[]; // for skill-match with mentor

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(5)
  skillLevel?: number; // 0–5

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(168)
  availabilityHoursPerWeek?: number;

  @IsString()
  @IsOptional()
  timezone?: string; // e.g. "Africa/Nairobi"

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  portfolioLinks?: string[]; // URLs
}

