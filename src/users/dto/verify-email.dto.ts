import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ description: '6-digit OTP verification code' })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiPropertyOptional({ description: 'User email (optional, for additional verification)' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

