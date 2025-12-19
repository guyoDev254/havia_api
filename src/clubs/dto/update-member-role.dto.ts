import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ClubRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ClubRole, description: 'New role for the member' })
  @IsEnum(ClubRole)
  @IsNotEmpty()
  role: ClubRole;
}

