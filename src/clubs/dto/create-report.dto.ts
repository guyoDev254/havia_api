import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClubReportType } from '@prisma/client';

export class CreateReportDto {
  @ApiProperty({ enum: ClubReportType, description: 'Report type' })
  @IsEnum(ClubReportType)
  type: ClubReportType;

  @ApiProperty({ description: 'Report title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Report content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Period start date' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ description: 'Period end date' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional({ description: 'Report data (JSON)' })
  @IsOptional()
  @IsObject()
  data?: any;

  @ApiPropertyOptional({ description: 'Template type' })
  @IsOptional()
  @IsString()
  templateType?: string;

  @ApiPropertyOptional({ description: 'Whether report is public to members', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

