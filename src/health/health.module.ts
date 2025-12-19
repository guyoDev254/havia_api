import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { EmailService } from '../common/services/email.service';

@Module({
  controllers: [HealthController],
  providers: [EmailService],
})
export class HealthModule {}

