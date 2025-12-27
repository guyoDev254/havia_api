import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { GoalStatus } from '@prisma/client';

export class CreateStudentGoalDto {
  @ApiProperty({ description: 'Goal title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Goal description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: GoalStatus, description: 'Goal status' })
  @IsEnum(GoalStatus)
  @IsOptional()
  status?: GoalStatus;

  @ApiPropertyOptional({ description: 'Target completion date' })
  @IsDateString()
  @IsOptional()
  targetDate?: string;
}

export class UpdateStudentGoalDto {
  @ApiPropertyOptional({ description: 'Goal title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Goal description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: GoalStatus, description: 'Goal status' })
  @IsEnum(GoalStatus)
  @IsOptional()
  status?: GoalStatus;

  @ApiPropertyOptional({ description: 'Target completion date' })
  @IsDateString()
  @IsOptional()
  targetDate?: string;
}

