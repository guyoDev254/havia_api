import { IsString, IsOptional, IsArray, IsInt, IsEnum, IsBoolean, IsUrl, Min, Max } from 'class-validator';
import { MentorshipTheme, MentorshipStyle, MentorshipType } from '@prisma/client';

export class CreateMentorProfileDto {
  @IsString()
  @IsOptional()
  company?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  yearsOfExperience?: number;

  @IsUrl()
  @IsOptional()
  linkedIn?: string;

  @IsArray()
  @IsEnum(MentorshipTheme, { each: true })
  mentorshipThemes: MentorshipTheme[];

  @IsArray()
  @IsEnum(MentorshipStyle, { each: true })
  mentorshipStyle: MentorshipStyle[];

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(40)
  weeklyAvailability?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(10)
  maxMentees?: number;

  @IsEnum(MentorshipType)
  @IsOptional()
  preferredType?: MentorshipType;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsBoolean()
  @IsOptional()
  commitmentAgreed?: boolean;
}

