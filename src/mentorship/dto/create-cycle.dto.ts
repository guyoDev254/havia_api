import { IsString, IsDateString, IsOptional, IsInt, Min, Max, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CohortTargetGroup } from '@prisma/client';
import { CohortPhaseDto } from './cohort-phase.dto';

export class CreateCycleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  benefits?: string;

  @IsString()
  @IsOptional()
  expectedOutcomes?: string;

  @IsString()
  @IsOptional()
  requirements?: string;

  @IsString()
  @IsOptional()
  targetGroup?: string;

  @IsEnum(CohortTargetGroup)
  @IsOptional()
  targetGroupEnum?: CohortTargetGroup;

  @IsString()
  @IsOptional()
  conditions?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  maxMentorships?: number;

  /** NorthernBox: max 10–20 per cohort. Default 20. */
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(50)
  maxCohortSize?: number;

  /** Program length in weeks (e.g. 12). */
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(52)
  totalWeeks?: number;

  /** Phases (e.g. Foundation 1–4, Application 5–8, Professionalization 9–12). If omitted, defaults are created. */
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CohortPhaseDto)
  phases?: CohortPhaseDto[];
}

