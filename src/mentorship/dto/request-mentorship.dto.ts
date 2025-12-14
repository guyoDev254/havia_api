import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestMentorshipDto {
  @ApiProperty({ description: 'Mentor user ID' })
  @IsString()
  mentorId: string;

  @ApiPropertyOptional({ description: 'Mentorship goals' })
  @IsOptional()
  @IsString()
  goals?: string;
}

