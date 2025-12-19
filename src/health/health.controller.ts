import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmailService } from '../common/services/email.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly emailService: EmailService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'havia-api',
    };
  }

  @Get('email/status')
  @ApiOperation({ summary: 'Check email service configuration status' })
  getEmailStatus() {
    return {
      ...this.emailService.getConfigurationStatus(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('email/test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test email service connection and send test email' })
  async testEmail(@Body('email') email?: string) {
    return this.emailService.testEmailConnection(email);
  }
}
