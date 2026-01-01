import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFinancialContributionDto {
  @ApiPropertyOptional({ description: 'Fundraising campaign ID (optional)' })
  @IsOptional()
  @IsString()
  fundraisingId?: string;

  @ApiProperty({ description: 'Contribution amount', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'KES' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Payment method' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Payment reference/transaction ID' })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

