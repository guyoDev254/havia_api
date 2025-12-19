import { Module } from '@nestjs/common';
import { CommunityPartnersController } from './community-partners.controller';
import { CommunityPartnersService } from './community-partners.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [PrismaModule],
  controllers: [CommunityPartnersController],
  providers: [CommunityPartnersService, AuditService],
  exports: [CommunityPartnersService],
})
export class CommunityPartnersModule {}

