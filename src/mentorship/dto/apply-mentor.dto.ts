import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyMentorDto {
  @ApiPropertyOptional({ description: 'Bio/About section' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Areas of expertise (comma-separated)' })
  @IsOptional()
  @IsString()
  expertise?: string;

  @ApiPropertyOptional({ description: 'Availability information' })
  @IsOptional()
  @IsString()
  availability?: string;

  @ApiPropertyOptional({ description: 'Mentoring goals' })
  @IsOptional()
  @IsString()
  goals?: string;
}

