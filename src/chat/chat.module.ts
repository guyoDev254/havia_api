import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { EncryptionService } from '../common/services/encryption.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ChatController],
  providers: [ChatService, EncryptionService],
  exports: [ChatService],
})
export class ChatModule {}

