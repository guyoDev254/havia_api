import { IsEnum, IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType, ReportEntityType } from '@prisma/client';

export class CreateReportDto {
  @ApiProperty({ enum: ReportEntityType, description: 'Type of entity being reported' })
  @IsEnum(ReportEntityType)
  entityType: ReportEntityType;

  @ApiPropertyOptional({ description: 'ID of the reported entity (post, comment, etc.)' })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ description: 'ID of the user being reported (if entity is USER)' })
  @IsOptional()
  @IsUUID()
  reportedUserId?: string;

  @ApiProperty({ enum: ReportType, description: 'Type of report' })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({ description: 'Reason for the report' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Additional details' })
  @IsOptional()
  @IsString()
  description?: string;
}

