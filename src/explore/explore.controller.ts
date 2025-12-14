import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ExploreService } from './explore.service';

@ApiTags('explore')
@Controller('explore')
export class ExploreController {
  constructor(private readonly exploreService: ExploreService) {}

  @Get(':category')
  @ApiOperation({ summary: 'Get explore content by category' })
  @ApiParam({
    name: 'category',
    enum: ['opportunities', 'resources', 'articles', 'partners'],
    description: 'Content category',
  })
  async getContent(@Param('category') category: string) {
    return this.exploreService.getContent(category as any);
  }
}

