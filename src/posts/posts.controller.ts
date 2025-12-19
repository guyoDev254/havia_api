import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReactionType } from '@prisma/client';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post or reply' })
  async create(@CurrentUser() user: any, @Body() createPostDto: CreatePostDto) {
    return this.postsService.create(user.id, createPostDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all posts (feed)' })
  @ApiQuery({ name: 'clubId', required: false, description: 'Filter by club' })
  @ApiQuery({ name: 'parentPostId', required: false, description: 'Get replies to a post' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, description: 'Pagination cursor' })
  async findAll(
    @Query('clubId') clubId?: string,
    @Query('parentPostId') parentPostId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @CurrentUser() user?: any,
  ) {
    return this.postsService.findAll(
      user?.id,
      clubId,
      parentPostId,
      limit ? parseInt(limit) : 20,
      cursor,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post by ID with replies and comments' })
  async findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.postsService.findOne(id, user?.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('content') content: string,
  ) {
    return this.postsService.update(id, user.id, content);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a post' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postsService.delete(id, user.id);
  }

  @Post(':id/react')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'React to a post (like, love, support, celebrate)' })
  @ApiQuery({ name: 'type', enum: ReactionType, description: 'Reaction type' })
  async react(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('type') type: ReactionType,
  ) {
    return this.postsService.react(id, user.id, type);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false })
  async getComments(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.postsService.getComments(id, limit ? parseInt(limit) : 20, cursor);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a comment to a post' })
  async createComment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.postsService.createComment(id, user.id, createCommentDto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  async deleteComment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postsService.deleteComment(id, user.id);
  }

  @Get(':id/reactions')
  @ApiOperation({ summary: 'Get reaction counts for a post' })
  async getReactions(@Param('id') id: string) {
    return this.postsService.getReactions(id);
  }
}

