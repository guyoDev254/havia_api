import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignClubManagerDto {
  @ApiProperty({ description: 'User ID to assign as club manager' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}

