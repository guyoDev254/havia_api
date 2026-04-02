import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { CohortApplicationStatus } from '@prisma/client';

export class UpdateCohortApplicationDto {
  @IsEnum(CohortApplicationStatus)
  @IsOptional()
  status?: CohortApplicationStatus;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  screeningScore?: number;

  @IsString()
  @IsOptional()
  screeningNotes?: string;
}
