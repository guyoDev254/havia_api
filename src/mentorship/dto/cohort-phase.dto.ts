import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CohortPhaseDto {
  @IsInt()
  @Min(1)
  @Max(3)
  phaseOrder: number;

  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  @Max(12)
  startWeek: number;

  @IsInt()
  @Min(1)
  @Max(12)
  endWeek: number;

  @IsString()
  @IsOptional()
  description?: string;
}
