import { IsString, IsOptional, IsEnum, IsUrl, MaxLength, ValidateIf } from 'class-validator';
import { ProofOfInterestType } from '@prisma/client';

export class CreateCohortApplicationDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  shortBio?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  whyJoin?: string;

  @IsEnum(ProofOfInterestType)
  @IsOptional()
  proofOfInterestType?: ProofOfInterestType;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  proofOfInterestValue?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  availabilityCommitment?: string;

  @IsOptional()
  @ValidateIf((_o, v) => v != null && v !== '')
  @IsUrl()
  technicalTaskUrl?: string;

  @IsOptional()
  @ValidateIf((_o, v) => v != null && v !== '')
  @IsUrl()
  videoIntroUrl?: string;
}
