import {
  Body,
  Controller,
  Get,
  HttpCode,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { EvaluateBuildDto } from './dto/evaluate-build.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('counters')
  getCounterPicks(@Query('enemyHeroId', ParseIntPipe) enemyHeroId: number) {
    return this.analyticsService.getCounters(enemyHeroId);
  }

  @Get('synergy')
  getSynergy(@Query('heroId', ParseIntPipe) heroId: number) {
    return this.analyticsService.getSynergy(heroId);
  }

  @Get('lane')
  getLaneMatchup(
    @Query('myHeroId', ParseIntPipe) myHeroId: number,
    @Query('enemyHeroId', ParseIntPipe) enemyHeroId: number,
  ) {
    return this.analyticsService.getLaneMatchup(myHeroId, enemyHeroId);
  }

  @Get('items/recommendations')
  getRecommendedItems(
    @Query('myHeroId', ParseIntPipe) myHeroId: number,
    @Query('enemyHeroId', ParseIntPipe) enemyHeroId: number,
  ) {
    return this.analyticsService.getRecommendedItems(myHeroId, enemyHeroId);
  }

  @Get('popular-build')
  getPopularBuild(@Query('heroId', ParseIntPipe) heroId: number) {
    return this.analyticsService.getPopularBuild(heroId);
  }

  @Post('compare')
  @HttpCode(200)
  compareBuild(@Body() dto: EvaluateBuildDto) {
    return this.analyticsService.evaluateBuild(dto.heroId, dto.itemIds);
  }
}
