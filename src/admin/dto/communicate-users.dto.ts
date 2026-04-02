import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export enum CommunicationChannel {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

export class CommunicateUsersDto {
  @ApiProperty({
    type: [String],
    description: 'User IDs to receive the communication',
    example: ['9f8bcb6a-5578-4ef1-99bc-b2d428b6d1a6'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiProperty({
    description: 'Communication subject/title',
    example: 'Important platform update',
  })
  @IsString()
  @MinLength(3)
  subject: string;

  @ApiProperty({
    description: 'Communication message body',
    example: 'We will have a short maintenance window tonight at 10 PM.',
  })
  @IsString()
  @MinLength(5)
  message: string;

  @ApiPropertyOptional({
    enum: CommunicationChannel,
    isArray: true,
    description: 'Delivery channels. Defaults to EMAIL when omitted.',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(CommunicationChannel, { each: true })
  channels?: CommunicationChannel[];
}
