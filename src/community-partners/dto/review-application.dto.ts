import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartnerApplicationStatus } from '@prisma/client';

export class ReviewApplicationDto {
  @ApiProperty({ enum: PartnerApplicationStatus })
  @IsEnum(PartnerApplicationStatus)
  status: PartnerApplicationStatus;

  @ApiPropertyOptional({ description: 'Admin notes during review' })
  @IsString()
  @IsOptional()
  applicationNotes?: string;
}

