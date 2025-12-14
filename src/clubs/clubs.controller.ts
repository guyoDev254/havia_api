import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ClubsService } from './clubs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateClubDto } from './dto/create-club.dto';
import { AssignClubManagerDto } from './dto/assign-club-manager.dto';

@ApiTags('clubs')
@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all clubs' })
  @ApiQuery({ name: 'category', required: false, enum: ['TECH', 'BUSINESS', 'CREATIVE', 'HEALTH', 'LEADERSHIP', 'EDUCATION', 'OTHER'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Query('category') category?: string, @Query('limit') limit?: string) {
    return this.clubsService.findAll(category as any, limit ? parseInt(limit) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get club by ID' })
  async findOne(@Param('id') id: string) {
    return this.clubsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new club' })
  async create(@CurrentUser() user: any, @Body() data: CreateClubDto) {
    return this.clubsService.create(user.id, data);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get club members' })
  async getMembers(@Param('id') id: string) {
    return this.clubsService.getMembers(id);
  }

  @Get(':id/is-member')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if current user is a member' })
  async checkMembership(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clubsService.checkMembership(user.id, id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a club' })
  async joinClub(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clubsService.joinClub(user.id, id);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave a club' })
  async leaveClub(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clubsService.leaveClub(user.id, id);
  }

  @Post(':id/managers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a club manager (Admin/Moderator only)' })
  async assignManager(
    @CurrentUser() user: any,
    @Param('id') clubId: string,
    @Body() assignManagerDto: AssignClubManagerDto,
  ) {
    return this.clubsService.assignManager(clubId, assignManagerDto.userId, user.id);
  }

  @Get(':id/managers')
  @ApiOperation({ summary: 'Get all managers of a club' })
  async getManagers(@Param('id') id: string) {
    return this.clubsService.getManagers(id);
  }

  @Delete(':id/managers/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a club manager (Admin/Moderator only)' })
  async removeManager(@Param('id') clubId: string, @Param('userId') userId: string) {
    return this.clubsService.removeManager(clubId, userId);
  }

  @Get('me/managed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get clubs managed by current user' })
  async getManagedClubs(@CurrentUser() user: any) {
    return this.clubsService.getManagedClubs(user.id);
  }

  @Get(':id/is-manager')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if current user is a manager of the club' })
  async isManager(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clubsService.isManager(user.id, id);
  }
}

