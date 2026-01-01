import { IsString, IsOptional, Matches, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterEventDto {
  @ApiPropertyOptional({ 
    description: 'M-Pesa phone number (required for paid events). Format: 2547XXXXXXXX',
    example: '254712345678'
  })
  @IsOptional()
  @IsString()
  @Matches(/^2547\d{8}$/, {
    message: 'Phone number must be in format 2547XXXXXXXX (e.g., 254712345678)',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({ 
    description: 'Number of tickets to purchase (default: 1, max: 10)',
    example: 2,
    minimum: 1,
    maximum: 10,
    default: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  quantity?: number;
}

