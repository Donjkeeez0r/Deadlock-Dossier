import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssetsService {
  constructor(private prismaService: PrismaService) {}

  getHeroes() {
    return this.prismaService.hero.findMany({
      where: { isPlayable: true },
      orderBy: { name: 'asc' },
    });
  }

  getItems() {
    // Тултипы отдаются отдельно (getItemTooltips): список нужен везде, подсказки — только при наведении.
    return this.prismaService.item.findMany({
      orderBy: [{ tier: 'asc' }, { cost: 'asc' }],
      omit: { tooltip: true },
    });
  }

  async getItemTooltips() {
    const items = await this.prismaService.item.findMany({
      where: { tooltip: { not: Prisma.DbNull } },
      select: { id: true, tooltip: true },
    });
    return Object.fromEntries(
      items.map((item) => [item.id.toString(), item.tooltip]),
    );
  }
}
