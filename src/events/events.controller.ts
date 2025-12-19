import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/permissions/permissions.constant';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateEventDto } from './dto/create-event.dto';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all events' })
  @ApiQuery({ name: 'status', required: false, enum: ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'] })
  @ApiQuery({ name: 'type', required: false, enum: ['WORKSHOP', 'MEETUP', 'CONFERENCE', 'WEBINAR', 'CHALLENGE', 'OTHER'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Query() filters: any) {
    const parsedFilters = {
      ...filters,
      ...(filters.limit && { limit: parseInt(filters.limit) }),
    };
    return this.eventsService.findAll(parsedFilters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_EVENTS, Permission.SCHEDULE_EVENTS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event' })
  async create(@CurrentUser() user: any, @Body() data: CreateEventDto) {
    return this.eventsService.create(user.id, data);
  }

  @Post('clubs/:clubId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an event for a club (Super Admin, Club Managers, and Club Leads only)' })
  async createClubEvent(
    @CurrentUser() user: any,
    @Param('clubId') clubId: string,
    @Body() data: CreateEventDto,
  ) {
    return this.eventsService.createClubEvent(user.id, clubId, data, user.role);
  }

  @Post(':id/rsvp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'RSVP to an event' })
  async rsvp(@CurrentUser() user: any, @Param('id') id: string) {
    return this.eventsService.rsvp(user.id, id);
  }

  @Post(':id/cancel-rsvp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel RSVP to an event' })
  async cancelRsvp(@CurrentUser() user: any, @Param('id') id: string) {
    return this.eventsService.cancelRsvp(user.id, id);
  }

  @Get(':id/attendees')
  @ApiOperation({ summary: 'Get event attendees' })
  async getAttendees(@Param('id') id: string) {
    return this.eventsService.getAttendees(id);
  }
}

