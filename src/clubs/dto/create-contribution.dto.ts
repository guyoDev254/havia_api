import { IsEnum, IsString, IsOptional, IsNumber, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContributionType } from '@prisma/client';

export class CreateContributionDto {
  @ApiProperty({ enum: ContributionType, description: 'Type of contribution' })
  @IsEnum(ContributionType)
  type: ContributionType;

  @ApiProperty({ description: 'Title of the contribution' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Description of the contribution' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Amount (for donations)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'KES' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Hours volunteered', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hours?: number;

  @ApiPropertyOptional({ description: 'Skills offered', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'Resources provided', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  resources?: string[];
}

