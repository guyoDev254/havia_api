import { IsString, IsOptional, IsDateString, IsBoolean, IsNumber, Min } from 'class-validator';

export class CreateStudyGroupMeetupDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @IsString()
  onlineLink?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAttendees?: number;
}

