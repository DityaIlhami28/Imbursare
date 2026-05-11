import { Test, TestingModule } from '@nestjs/testing';
import { AmountPolicyService } from './amount-policy.service';
import { PrismaModule } from '../../prisma/prisma.module';

describe('AmountPolicyService', () => {
  let service: AmountPolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [AmountPolicyService],
    }).compile();

    service = module.get<AmountPolicyService>(AmountPolicyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
