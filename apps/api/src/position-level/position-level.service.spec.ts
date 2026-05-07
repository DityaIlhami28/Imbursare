import { Test, TestingModule } from '@nestjs/testing';
import { PositionLevelService } from './position-level.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PositionLevelService', () => {
  let service: PositionLevelService;
  const mockPrisma = {
    membership: {
      findFirst: jest.fn(),
    },
    positionLevel: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PositionLevelService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PositionLevelService>(PositionLevelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
