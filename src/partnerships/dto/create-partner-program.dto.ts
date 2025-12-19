import { IsString, IsOptional, IsUrl, IsBoolean, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePartnerProgramDto {
  @ApiProperty({ description: 'Partner ID' })
  @IsUUID()
  partnerId: string;

  @ApiProperty({ description: 'Program title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Program description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Program type (scholarship, internship, training, event, other)' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Program URL' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

