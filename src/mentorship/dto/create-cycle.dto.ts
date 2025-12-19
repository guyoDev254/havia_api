import { IsString, IsDateString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateCycleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  benefits?: string;

  @IsString()
  @IsOptional()
  expectedOutcomes?: string;

  @IsString()
  @IsOptional()
  requirements?: string;

  @IsString()
  @IsOptional()
  targetGroup?: string;

  @IsString()
  @IsOptional()
  conditions?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  maxMentorships?: number;
}

