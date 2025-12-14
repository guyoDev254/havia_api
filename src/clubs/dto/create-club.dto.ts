import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClubCategory } from '@prisma/client';

export class CreateClubDto {
  @ApiProperty({ description: 'Club name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Club description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Club image URL' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ enum: ClubCategory, description: 'Club category' })
  @IsOptional()
  @IsEnum(ClubCategory)
  category?: ClubCategory;

  @ApiPropertyOptional({ description: 'Is club public', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

