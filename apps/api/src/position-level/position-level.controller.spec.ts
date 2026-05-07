import { Test, TestingModule } from '@nestjs/testing';
import { PositionLevelController } from './position-level.controller';
import { PositionLevelService } from './position-level.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PositionLevelController', () => {
  let controller: PositionLevelController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PositionLevelController],
      providers: [
        PositionLevelService,
        {
          provide: PrismaService,
          useValue: {
            membership: { findFirst: async () => ({}) },
            positionLevel: {
              findMany: async () => [],
              findFirst: async () => null,
              create: async () => ({}),
            },
            user: { update: async () => ({}) },
          },
        },
      ],
    }).compile();

    controller = module.get<PositionLevelController>(PositionLevelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
