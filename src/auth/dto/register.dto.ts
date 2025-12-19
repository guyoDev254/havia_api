import { IsEmail, IsString, MinLength, IsOptional, IsPhoneNumber, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EducationLevel } from '@prisma/client';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsPhoneNumber('KE')
  phone?: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty({ required: false, description: 'Whether the user is registering as a student' })
  @IsOptional()
  @IsBoolean()
  isStudent?: boolean;

  @ApiProperty({ required: false, enum: EducationLevel, description: 'Education level (required if isStudent=true)' })
  @IsOptional()
  @IsEnum(EducationLevel)
  educationLevel?: EducationLevel;
}

