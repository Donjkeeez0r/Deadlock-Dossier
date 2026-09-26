import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { BuildService } from './build.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AnalyticsService } from '../analytics/analytics.service';

// Настоящие модули тянут ESM-зависимости (@nestjs/config), которые jest не грузит.
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../analytics/analytics.service', () => ({
  AnalyticsService: class {},
}));

describe('BuildService', () => {
  const savedBuild = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  const analytics = { evaluateBuild: jest.fn() };
  let service: BuildService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new BuildService(
      { savedBuild } as unknown as PrismaService,
      analytics as unknown as AnalyticsService,
    );
  });

  const dto = { name: 'Сборка', heroId: 1, itemIds: [10, 20] };

  describe('saveBuild', () => {
    it('гость сохраняет без владельца', async () => {
      savedBuild.create.mockResolvedValue({ id: 'b1', userId: null });
      await expect(service.saveBuild(dto)).resolves.toEqual({
        shareId: 'b1',
        owned: false,
      });
      expect(savedBuild.create).toHaveBeenCalledWith({
        data: { ...dto, userId: null },
      });
    });

    it('вошедший сохраняет в свой аккаунт', async () => {
      savedBuild.create.mockResolvedValue({ id: 'b1', userId: 'u1' });
      await expect(service.saveBuild(dto, 'u1')).resolves.toEqual({
        shareId: 'b1',
        owned: true,
      });
      expect(savedBuild.create).toHaveBeenCalledWith({
        data: { ...dto, userId: 'u1' },
      });
    });
  });

  it('токен удалённого пользователя — 401, а не 500', async () => {
    savedBuild.create.mockRejectedValue(
      Object.assign(new Error('fk'), { code: 'P2003' }),
    );
    await expect(service.saveBuild(dto, 'gone')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  describe('getBuildByShareId', () => {
    const build = {
      id: 'b1',
      name: 'Сборка',
      heroId: 1,
      itemIds: [10n, 20n],
      createdAt: new Date(0),
      userId: 'u1',
    };

    beforeEach(() => {
      savedBuild.findUnique.mockResolvedValue(build);
      analytics.evaluateBuild.mockResolvedValue({});
    });

    it('isOwner только у владельца', async () => {
      expect((await service.getBuildByShareId('b1', 'u1')).isOwner).toBe(true);
      expect((await service.getBuildByShareId('b1', 'u2')).isOwner).toBe(false);
      expect((await service.getBuildByShareId('b1')).isOwner).toBe(false);
    });

    it('анонимная сборка ничья, даже для гостя', async () => {
      savedBuild.findUnique.mockResolvedValue({ ...build, userId: null });
      expect((await service.getBuildByShareId('b1')).isOwner).toBe(false);
    });
  });

  it('getUserBuilds фильтрует по владельцу и переводит BigInt в числа', async () => {
    savedBuild.findMany.mockResolvedValue([
      {
        id: 'b1',
        name: 'A',
        heroId: 1,
        itemIds: [10n],
        createdAt: new Date(0),
      },
    ]);
    const result = await service.getUserBuilds('u1');
    expect(result[0].itemIds).toEqual([10]);
    expect(savedBuild.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
  });

  describe('renameBuild / deleteBuild', () => {
    it('условие включает владельца', async () => {
      savedBuild.updateMany.mockResolvedValue({ count: 1 });
      savedBuild.deleteMany.mockResolvedValue({ count: 1 });
      await expect(service.renameBuild('b1', 'u1', 'Новое')).resolves.toEqual({
        id: 'b1',
        name: 'Новое',
      });
      await service.deleteBuild('b1', 'u1');
      expect(savedBuild.updateMany).toHaveBeenCalledWith({
        where: { id: 'b1', userId: 'u1' },
        data: { name: 'Новое' },
      });
      expect(savedBuild.deleteMany).toHaveBeenCalledWith({
        where: { id: 'b1', userId: 'u1' },
      });
    });

    it('чужая или несуществующая сборка — 404', async () => {
      savedBuild.updateMany.mockResolvedValue({ count: 0 });
      savedBuild.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.renameBuild('b1', 'u2', 'X')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteBuild('b1', 'u2')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
