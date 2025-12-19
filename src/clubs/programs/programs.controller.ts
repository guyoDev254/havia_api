import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProgramsService } from './programs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { ProgramStatus, ProgramType } from '@prisma/client';

@ApiTags('club-programs')
@Controller('clubs/:clubId/programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new program for a club' })
  async create(
    @CurrentUser() user: any,
    @Param('clubId') clubId: string,
    @Body() data: CreateProgramDto,
  ) {
    return this.programsService.create(clubId, user.id, data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all programs for a club' })
  @ApiQuery({ name: 'status', required: false, enum: ProgramStatus })
  @ApiQuery({ name: 'type', required: false, enum: ProgramType })
  async findAll(
    @Param('clubId') clubId: string,
    @Query('status') status?: ProgramStatus,
    @Query('type') type?: ProgramType,
  ) {
    return this.programsService.findAll(clubId, status, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get program by ID' })
  async findOne(@Param('id') id: string) {
    return this.programsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a program' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: UpdateProgramDto,
  ) {
    return this.programsService.update(id, user.id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a program' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.programsService.remove(id, user.id);
  }

  @Post(':id/enroll')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll in a program' })
  async enroll(@CurrentUser() user: any, @Param('id') programId: string) {
    return this.programsService.enroll(programId, user.id);
  }

  @Post(':id/unenroll')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unenroll from a program' })
  async unenroll(@CurrentUser() user: any, @Param('id') programId: string) {
    return this.programsService.unenroll(programId, user.id);
  }

  @Put(':id/participants/:participantId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update participant status (club leads/admins/managers only)' })
  async updateParticipantStatus(
    @CurrentUser() user: any,
    @Param('id') programId: string,
    @Param('participantId') participantId: string,
    @Body('status') status: string,
  ) {
    return this.programsService.updateParticipantStatus(programId, participantId, user.id, status);
  }
}

