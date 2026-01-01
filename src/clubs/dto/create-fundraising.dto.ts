import { IsString, IsOptional, IsNumber, IsDateString, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FundraisingStatus } from '@prisma/client';

export class CreateFundraisingDto {
  @ApiProperty({ description: 'Title of the fundraising campaign' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description of the fundraising campaign' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Goal amount', minimum: 0 })
  @IsNumber()
  @Min(0)
  goalAmount: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'KES' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Campaign image URL' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'Payment link' })
  @IsOptional()
  @IsString()
  paymentLink?: string;

  @ApiPropertyOptional({ description: 'Template type' })
  @IsOptional()
  @IsString()
  templateType?: string;
}

