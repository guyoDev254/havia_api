import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BadgesService } from './badges.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('badges')
@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all badges' })
  async findAll(@Query('type') type?: string) {
    return this.badgesService.findAll(type as any);
  }

  /** Must be before @Get(':id') so /badges/me is not matched as badge id "me" */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user badges' })
  async getUserBadges(@CurrentUser() user: any) {
    return this.badgesService.getUserBadges(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get badge by ID' })
  async findOne(@Param('id') id: string) {
    return this.badgesService.findOne(id);
  }

  @Post(':id/award')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Award badge to user (admin only)' })
  async awardBadge(@CurrentUser() user: any, @Param('id') id: string) {
    // In production, add admin check here
    return this.badgesService.awardBadge(user.id, id);
  }
}

