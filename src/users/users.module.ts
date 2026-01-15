import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { StorageService } from '../common/services/storage.service';
import { EmailService } from '../common/services/email.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [UsersController],
  providers: [UsersService, StorageService, EmailService],
  exports: [UsersService],
})
export class UsersModule {}

