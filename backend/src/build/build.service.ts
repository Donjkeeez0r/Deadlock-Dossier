import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { SaveBuildDto } from './dto/save-build.dto';

@Injectable()
export class BuildService {
  constructor(
    private prismaService: PrismaService,
    private analyticsService: AnalyticsService,
  ) {}

  async saveBuild(dto: SaveBuildDto, userId?: string) {
    const build = await this.prismaService.savedBuild
      .create({ data: { ...dto, userId: userId ?? null } })
      .catch((error: unknown) => {
        // P2003 — нарушен внешний ключ: токен действует, а пользователя уже нет.
        if ((error as { code?: string }).code === 'P2003') {
          throw new UnauthorizedException('Сессия истекла, войдите снова!');
        }
        throw error;
      });

    return {
      shareId: build.id,
      owned: build.userId !== null,
    };
  }

  async getBuildByShareId(shareId: string, userId?: string) {
    const build = await this.prismaService.savedBuild.findUnique({
      where: { id: shareId },
    });

    if (!build) {
      throw new NotFoundException('Сборка не найдена!');
    }

    const evaluation = await this.analyticsService.evaluateBuild(
      build.heroId,
      build.itemIds.map(Number),
    );

    return {
      id: build.id,
      name: build.name,
      createdAt: build.createdAt,
      isOwner: !!userId && build.userId === userId,
      evaluation,
    };
  }

  async getUserBuilds(userId: string) {
    const builds = await this.prismaService.savedBuild.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        heroId: true,
        itemIds: true,
        createdAt: true,
      },
    });

    return builds.map((build) => ({
      ...build,
      itemIds: build.itemIds.map(Number),
    }));
  }

  async renameBuild(shareId: string, userId: string, name: string) {
    // Чужая сборка и несуществующая неотличимы: не подтверждаем, что id занят.
    const { count } = await this.prismaService.savedBuild.updateMany({
      where: { id: shareId, userId },
      data: { name },
    });

    if (count === 0) {
      throw new NotFoundException('Сборка не найдена!');
    }

    return { id: shareId, name };
  }

  async deleteBuild(shareId: string, userId: string) {
    const { count } = await this.prismaService.savedBuild.deleteMany({
      where: { id: shareId, userId },
    });

    if (count === 0) {
      throw new NotFoundException('Сборка не найдена!');
    }
  }
}
