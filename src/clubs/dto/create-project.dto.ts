import { IsString, IsOptional, IsNumber, IsDateString, IsEnum, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Project description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: ProjectStatus, description: 'Project status' })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Project budget', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'KES' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Template type' })
  @IsOptional()
  @IsString()
  templateType?: string;

  @ApiPropertyOptional({ description: 'Project objectives', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectives?: string[];

  @ApiPropertyOptional({ description: 'Expected deliverables', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];
}

