import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClubCategory } from '@prisma/client';

export class CreateClubDto {
  @ApiProperty({ description: 'Club name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Club description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Club image URL (legacy)' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'Club logo URL (square image)' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ description: 'Club banner URL (wide image)' })
  @IsOptional()
  @IsString()
  banner?: string;

  @ApiProperty({ enum: ClubCategory, description: 'Club category' })
  @IsEnum(ClubCategory)
  category: ClubCategory;

  @ApiPropertyOptional({ description: 'Is club public', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  // Application fields (required for community-led clubs)
  @ApiProperty({ description: 'Problem this club solves' })
  @IsString()
  problemStatement: string;

  @ApiProperty({ description: 'Target audience for this club' })
  @IsString()
  targetAudience: string;

  @ApiProperty({ description: 'Planned activities for first 30 days' })
  @IsString()
  plannedActivities: string;

  @ApiPropertyOptional({ description: 'Proposed club lead user ID (defaults to creator)' })
  @IsOptional()
  @IsString()
  leadId?: string;
}

