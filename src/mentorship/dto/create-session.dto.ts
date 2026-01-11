import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsInt, Min, Max, IsBoolean, IsUrl, ValidateIf } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ description: 'Scheduled date and time for the session' })
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional({ description: 'Topics to be covered in the session' })
  @IsOptional()
  @IsString()
  topics?: string;

  @ApiPropertyOptional({ description: 'Notes about the session' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Duration of the session in minutes', minimum: 15, maximum: 480 })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  duration?: number;

  @ApiPropertyOptional({ description: 'Physical location for in-person sessions' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Whether the session is online', default: false })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional({ description: 'Online meeting link (required if isOnline is true)' })
  @ValidateIf((o) => o.isOnline === true)
  @IsOptional()
  @IsString()
  onlineLink?: string;
}

