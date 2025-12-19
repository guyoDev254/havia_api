import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType, EventStatus } from '@prisma/client';

export class CreateEventDto {
  @ApiProperty({ description: 'Event title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Event image URL' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ enum: EventType, description: 'Event type' })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiPropertyOptional({ enum: EventStatus, description: 'Event status', default: 'UPCOMING' })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiProperty({ description: 'Event start date' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Event end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Event location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Is event online', default: false })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional({ description: 'Online link for virtual events' })
  @IsOptional()
  @IsString()
  onlineLink?: string;

  @ApiPropertyOptional({ description: 'Maximum attendees', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAttendees?: number;

  @ApiPropertyOptional({ description: 'Associated club ID' })
  @IsOptional()
  @IsString()
  clubId?: string;

  @ApiPropertyOptional({ description: 'Is this a paid event', default: false })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiPropertyOptional({ description: 'Event price (required if isPaid is true)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Currency code (e.g., KES, USD)', default: 'KES' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Payment link (e.g., M-Pesa, PayPal, Stripe)' })
  @IsOptional()
  @IsString()
  paymentLink?: string;
}

