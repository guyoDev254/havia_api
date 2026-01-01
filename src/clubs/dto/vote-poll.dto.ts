import { IsNumber, IsArray, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VotePollDto {
  @ApiProperty({ description: 'Index of selected option(s)', type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  optionIndices: number[];
}

