import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestMentorshipDto {
  @ApiProperty({ description: 'Mentor user ID' })
  @IsString()
  mentorId: string;

  @ApiProperty({ description: 'Cycle ID - All mentorships must belong to a cycle' })
  @IsString()
  cycleId: string;

  @ApiPropertyOptional({ description: 'Mentorship goals' })
  @IsOptional()
  @IsString()
  goals?: string;
}

