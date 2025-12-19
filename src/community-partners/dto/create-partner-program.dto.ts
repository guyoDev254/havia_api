import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePartnerProgramDto {
  @ApiProperty({ description: 'Program name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Program description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Program type', enum: ['workshop', 'course', 'challenge', 'other'] })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Is this a paid program?' })
  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;

  @ApiPropertyOptional({ description: 'Price (if paid)' })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'KES' })
  @IsString()
  @IsOptional()
  currency?: string;
}

