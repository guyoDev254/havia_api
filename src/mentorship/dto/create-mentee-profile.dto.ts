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
}

