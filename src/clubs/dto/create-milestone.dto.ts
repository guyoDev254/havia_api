import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMilestoneDto {
  @ApiProperty({ description: 'Milestone title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Milestone description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Target completion date' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}

