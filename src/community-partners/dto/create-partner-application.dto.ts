import { IsString, IsNotEmpty, IsOptional, IsEmail, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePartnerApplicationDto {
  @ApiProperty({ description: 'Partner organization name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Partner description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Primary focus area' })
  @IsString()
  @IsNotEmpty()
  focusArea: string;

  @ApiPropertyOptional({ description: 'Physical location or "Online"' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Contact phone' })
  @IsString()
  @IsOptional()
  contactPhone?: string;
}

