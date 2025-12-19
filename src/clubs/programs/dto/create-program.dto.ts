import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString, IsNumber, Min, IsArray, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgramType, ProgramStatus } from '@prisma/client';

export class CreateProgramDto {
  @ApiProperty({ description: 'Program title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Program description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ProgramType, description: 'Program type' })
  @IsOptional()
  @IsEnum(ProgramType)
  type?: ProgramType;

  @ApiPropertyOptional({ enum: ProgramStatus, description: 'Program status', default: 'DRAFT' })
  @IsOptional()
  @IsEnum(ProgramStatus)
  status?: ProgramStatus;

  @ApiPropertyOptional({ description: 'Program image URL' })
  @IsOptional()
  @IsString()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional({ description: 'Program start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Program end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Program duration in days' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({ description: 'Maximum participants (0 = unlimited)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxParticipants?: number;

  @ApiPropertyOptional({ description: 'Whether the program requires payment', default: false })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiPropertyOptional({ description: 'Program price (if paid)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'KES' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Payment link for paid programs' })
  @IsOptional()
  @IsString()
  @IsUrl()
  paymentLink?: string;

  @ApiPropertyOptional({ description: 'Learning objectives', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectives?: string[];

  @ApiPropertyOptional({ description: 'Program curriculum/content' })
  @IsOptional()
  @IsString()
  curriculum?: string;

  @ApiPropertyOptional({ description: 'Requirements to join the program' })
  @IsOptional()
  @IsString()
  requirements?: string;
}

