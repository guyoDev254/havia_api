import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFaqDto {
  @ApiProperty({ description: 'FAQ question' })
  @IsString()
  question: string;

  @ApiProperty({ description: 'FAQ answer' })
  @IsString()
  answer: string;

  @ApiPropertyOptional({ description: 'FAQ category for grouping' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Whether the FAQ is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

