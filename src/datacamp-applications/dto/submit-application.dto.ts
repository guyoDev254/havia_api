import { IsEmail, IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitDataCampApplicationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  fullName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  cityOfResidence: string;

  @ApiProperty()
  @IsString()
  @MaxLength(3000)
  motivationForDataScience: string;

  @ApiProperty()
  @IsString()
  @MaxLength(3000)
  howEnvisionLeveraging: string;

  @ApiProperty({ enum: ['Yes', 'No', 'Maybe'] })
  @IsString()
  previousCoursesOrProjects: string;

  @ApiProperty()
  @IsString()
  @MaxLength(3000)
  whyDeserveScholarship: string;

  @ApiPropertyOptional({ enum: ['Yes', 'No', 'Maybe'] })
  @IsOptional()
  @IsString()
  usedDataCampBefore?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  currentSituation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  dataCampCompletionDetails?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  highestEducationLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  educationDetails?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  scholarshipContribution?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(3000)
  challengesOrObstacles: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  areasOfInterest: string;

  @ApiProperty({ enum: ['Yes', 'No', 'Maybe'] })
  @IsString()
  participatedInProjects: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  projectsDetails?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  planToContribute?: string;

  @ApiProperty({ enum: ['Yes', 'No', 'Maybe'] })
  @IsString()
  affiliatedWithInstitutions: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  affiliationDetails?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  goalsThisYear?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  howFreeAccessWillHelp?: string;

  @ApiProperty({ enum: ['1 - 2 hrs', '3 - 4 hrs', '5 - 6 hrs', '7 and More'] })
  @IsString()
  hoursPerWeek: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  otherInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  howDidYouHear?: string;

  @ApiPropertyOptional({ enum: ['Yes', 'No', 'Maybe'] })
  @IsOptional()
  @IsString()
  internetAccess?: string;

  @ApiPropertyOptional({ enum: ['Yes', 'No', 'Maybe'] })
  @IsOptional()
  @IsString()
  computerAccess?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalUploadDetails?: string;
}
