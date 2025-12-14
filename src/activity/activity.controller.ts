import { Controller, Get, UseGuards, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('activity')
@Controller('activity')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('feed')
  @ApiOperation({ summary: 'Get activity feed for current user' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination', type: Number })
  async getActivityFeed(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.activityService.getActivityFeed(
      user.id,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user activities' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination', type: Number })
  async getMyActivities(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.activityService.getUserActivities(
      user.id,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get activities for a specific user' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination', type: Number })
  async getUserActivities(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.activityService.getUserActivities(
      userId,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }
}

