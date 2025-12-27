import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsEnum, IsObject } from 'class-validator';
import { ContentStatus } from '@prisma/client';

export class CreateContentDto {
  @ApiProperty({ description: 'Content title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Content description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Content type', enum: ['resource', 'opportunity', 'featured'] })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ enum: ContentStatus, description: 'Content status' })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @ApiPropertyOptional({ description: 'Whether content is featured' })
  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @ApiPropertyOptional({ description: 'Content image URL' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ description: 'Content URL (for external links)' })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ description: 'Content tags', type: [String] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata', type: Object })
  @IsObject()
  @IsOptional()
  metadata?: any;
}

