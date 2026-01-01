import { IsEnum, IsString, IsOptional, IsBoolean, IsArray, IsDateString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClubFeedType, PollOptionType } from '@prisma/client';

export class CreateClubFeedDto {
  @ApiProperty({ enum: ClubFeedType, description: 'Type of feed post' })
  @IsEnum(ClubFeedType)
  type: ClubFeedType;

  @ApiProperty({ description: 'Title of the feed post' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Content of the feed post' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Whether the post is pinned' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: 'Whether the post is public to all or members only' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  // Poll-specific fields
  @ApiPropertyOptional({ description: 'Poll options (for POLL type)', type: [String] })
  @ValidateIf(o => o.type === 'POLL')
  @IsArray()
  @IsString({ each: true })
  pollOptions?: string[];

  @ApiPropertyOptional({ enum: PollOptionType, description: 'Poll type (for POLL type)' })
  @ValidateIf(o => o.type === 'POLL')
  @IsEnum(PollOptionType)
  pollType?: PollOptionType;

  @ApiPropertyOptional({ description: 'Poll end date (for POLL type)' })
  @ValidateIf(o => o.type === 'POLL')
  @IsDateString()
  pollEndDate?: string;
}

