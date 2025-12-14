import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  async getConversations(@CurrentUser() user: any) {
    return this.chatService.getConversations(user.id);
  }

  @Get('messages/:userId')
  @ApiOperation({ summary: 'Get messages with a specific user' })
  async getMessages(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.chatService.getMessages(user.id, userId);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send a message' })
  async sendMessage(
    @CurrentUser() user: any,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.id, dto.receiverId, dto.content);
  }

  @Put('messages/:id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  async markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.chatService.markAsRead(user.id, id);
  }
}

