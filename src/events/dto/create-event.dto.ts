import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString, IsNumber, Min, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType, EventStatus, EventSource, EventLocationType } from '@prisma/client';

export class CreateEventDto {
  @ApiProperty({ description: 'Event title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Event image URL (square/thumbnail)' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'Event banner URL (wide banner for detail pages)' })
  @IsOptional()
  @IsString()
  banner?: string;

  @ApiPropertyOptional({ enum: EventType, description: 'Event type', default: 'OTHER' })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiPropertyOptional({ enum: EventStatus, description: 'Event status', default: 'UPCOMING' })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ enum: EventSource, description: 'Event source (PLATFORM or CLUB)', default: 'PLATFORM' })
  @IsOptional()
  @IsEnum(EventSource)
  source?: EventSource;

  @ApiPropertyOptional({ enum: EventLocationType, description: 'Event location type (ONLINE, PHYSICAL, HYBRID). If not provided, will be derived from isOnline field.' })
  @IsOptional()
  @Transform(({ value }) => value ? value.toUpperCase() : value)
  @IsEnum(EventLocationType)
  locationType?: EventLocationType;

  @ApiProperty({ description: 'Event start date' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Event end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Registration deadline' })
  @IsOptional()
  @IsDateString()
  registrationDeadline?: string;

  @ApiPropertyOptional({ description: 'Physical location (required if locationType is PHYSICAL or HYBRID)' })
  @ValidateIf((o) => o.locationType === 'PHYSICAL' || o.locationType === 'HYBRID')
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Online link (required if locationType is ONLINE or HYBRID)' })
  @ValidateIf((o) => o.locationType === 'ONLINE' || o.locationType === 'HYBRID')
  @IsString()
  onlineLink?: string;

  @ApiPropertyOptional({ description: 'Is event online (deprecated, use locationType)', default: false })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean; // Legacy field for backward compatibility

  @ApiPropertyOptional({ description: 'Maximum attendees (0 = unlimited)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAttendees?: number;

  @ApiPropertyOptional({ description: 'Associated club ID (required if source is CLUB)' })
  @ValidateIf((o) => o.source === 'CLUB')
  @IsString()
  clubId?: string;

  @ApiPropertyOptional({ description: 'Is this event public (for club events, false = members only)', default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Is this a paid event', default: false })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiPropertyOptional({ description: 'Event price in KES (required if isPaid is true)' })
  @ValidateIf((o) => o.isPaid === true)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Currency code (e.g., KES, USD)', default: 'KES' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Payment link (deprecated, M-Pesa STK Push is used instead)' })
  @IsOptional()
  @IsString()
  paymentLink?: string; // Legacy field

  @ApiPropertyOptional({ description: 'Event tags (array of strings)', type: [String] })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Speaker names or IDs (array of strings)', type: [String] })
  @IsOptional()
  speakers?: string[];

  @ApiPropertyOptional({ description: 'Event agenda/schedule' })
  @IsOptional()
  @IsString()
  agenda?: string;

  @ApiPropertyOptional({ description: 'Requirements to attend (e.g., bring laptop, prerequisites)' })
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiPropertyOptional({ description: 'Contact email for event inquiries' })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Contact phone for event inquiries' })
  @IsOptional()
  @IsString()
  contactPhone?: string;
}

