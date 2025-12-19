import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunityPartnersService } from './community-partners.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permission } from '../common/permissions/permissions.constant';
import { UserRole } from '@prisma/client';
import { CreatePartnerApplicationDto } from './dto/create-partner-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { CreateMemberRequestDto } from './dto/create-member-request.dto';
import { ReviewMemberRequestDto } from './dto/review-member-request.dto';
import { CreatePartnerProgramDto } from './dto/create-partner-program.dto';

@ApiTags('community-partners')
@Controller('community-partners')
export class CommunityPartnersController {
  constructor(private readonly partnersService: CommunityPartnersService) {}

  // Application endpoints
  @Post('applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a partner application' })
  async createApplication(
    @CurrentUser() user: any,
    @Body() dto: CreatePartnerApplicationDto,
  ) {
    return this.partnersService.createApplication(user.id, dto);
  }

  @Get('applications')
  @UseGuards(JwtAuthGuard, AdminGuard, RolesGuard, PermissionsGuard)
  @RequirePermissions(Permission.APPROVE_CLUBS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all partner applications (admin only)' })
  async getApplications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.partnersService.getApplications(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status as any,
    );
  }

  @Put('applications/:id/review')
  @UseGuards(JwtAuthGuard, AdminGuard, RolesGuard, PermissionsGuard)
  @RequirePermissions(Permission.APPROVE_CLUBS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review a partner application (admin only)' })
  async reviewApplication(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.partnersService.reviewApplication(id, admin.id, dto);
  }

  // Partner endpoints
  @Get()
  @ApiOperation({ summary: 'Get all partners' })
  async getAllPartners(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.partnersService.getAllPartners(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status as any,
      search,
    );
  }

  @Get('my-partners')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s partners' })
  async getUserPartners(@CurrentUser() user: any) {
    return this.partnersService.getUserPartners(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get partner by ID' })
  async getPartnerById(@Param('id') id: string) {
    return this.partnersService.getPartnerById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update partner (admin only)' })
  async updatePartner(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: UpdatePartnerDto,
  ) {
    return this.partnersService.updatePartner(id, dto, admin.id);
  }

  @Post(':id/suspend')
  @UseGuards(JwtAuthGuard, AdminGuard, RolesGuard, PermissionsGuard)
  @RequirePermissions(Permission.SUSPEND_USERS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend a partner (admin only)' })
  async suspendPartner(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.partnersService.suspendPartner(id, reason, admin.id);
  }

  // Member request endpoints
  @Post(':id/join-request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request to join a partner' })
  async requestToJoin(
    @CurrentUser() user: any,
    @Param('id') partnerId: string,
    @Body() dto: CreateMemberRequestDto,
  ) {
    return this.partnersService.requestToJoin(partnerId, user.id, dto);
  }

  @Get(':id/member-requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get member requests for a partner (partner admin only)' })
  async getMemberRequests(
    @CurrentUser() user: any,
    @Param('id') partnerId: string,
    @Query('status') status?: string,
  ) {
    return this.partnersService.getMemberRequests(partnerId, status);
  }

  @Put('member-requests/:id/review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review a member request (partner admin only)' })
  async reviewMemberRequest(
    @CurrentUser() user: any,
    @Param('id') requestId: string,
    @Body('partnerId') partnerId: string,
    @Body() dto: ReviewMemberRequestDto,
  ) {
    return this.partnersService.reviewMemberRequest(
      requestId,
      partnerId,
      user.id,
      dto,
    );
  }

  // Program endpoints
  @Post(':id/programs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a partner program (partner admin only)' })
  async createProgram(
    @CurrentUser() user: any,
    @Param('id') partnerId: string,
    @Body() dto: CreatePartnerProgramDto,
  ) {
    return this.partnersService.createProgram(partnerId, dto, user.id);
  }

  @Get(':id/programs')
  @ApiOperation({ summary: 'Get partner programs' })
  async getPartnerPrograms(@Param('id') partnerId: string) {
    return this.partnersService.getPartnerPrograms(partnerId);
  }
}

