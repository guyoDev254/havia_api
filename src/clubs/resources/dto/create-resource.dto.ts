import { IsString, IsOptional, IsEnum, IsBoolean, IsUrl, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClubResourceType, ClubRole } from '@prisma/client';

export class CreateResourceDto {
  @ApiProperty({ description: 'Resource title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Resource description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ClubResourceType, description: 'Resource type' })
  @IsOptional()
  @IsEnum(ClubResourceType)
  type?: ClubResourceType;

  @ApiPropertyOptional({ description: 'External resource URL' })
  @IsOptional()
  @IsString()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Uploaded file URL' })
  @IsOptional()
  @IsString()
  @IsUrl()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL for videos/images' })
  @IsOptional()
  @IsString()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Resource tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Category within club' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Pin this resource (appears first)', default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: 'Public to all members', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ 
    description: 'Roles that can access this resource (empty = all members)',
    enum: ClubRole,
    isArray: true 
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ClubRole, { each: true })
  accessibleToRoles?: ClubRole[];
}

