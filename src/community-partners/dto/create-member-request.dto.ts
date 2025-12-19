import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMemberRequestDto {
  @ApiPropertyOptional({ description: 'Optional message to partner' })
  @IsString()
  @IsOptional()
  message?: string;
}

