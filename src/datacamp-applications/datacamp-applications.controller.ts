import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataCampApplicationsService } from './datacamp-applications.service';
import { SubmitDataCampApplicationDto } from './dto/submit-application.dto';

@ApiTags('datacamp-donates')
@Controller('datacamp-donates')
export class DataCampApplicationsController {
  constructor(private readonly service: DataCampApplicationsService) {}

  @Post('applications')
  @ApiOperation({ summary: 'Submit a DataCamp Donates application (public)' })
  @ApiResponse({ status: 201, description: 'Application submitted' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async submit(@Body() dto: SubmitDataCampApplicationDto) {
    return this.service.submit(dto);
  }
}
