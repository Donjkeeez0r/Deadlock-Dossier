import { Controller, Get } from '@nestjs/common';
import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Get('heroes')
  getHeroes() {
    return this.assetsService.getHeroes();
  }

  @Get('items')
  getItems() {
    return this.assetsService.getItems();
  }

  @Get('items/tooltips')
  getItemTooltips() {
    return this.assetsService.getItemTooltips();
  }
}
