import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateStudyGroupPostDto {
  @IsString()
  title?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

