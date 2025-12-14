import { IsString, IsDateString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateCycleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  maxMentorships?: number;
}

