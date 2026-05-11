import { Test, TestingModule } from '@nestjs/testing';
import { AmountPolicyService } from './amount-policy.service';

describe('AmountPolicyService', () => {
  let service: AmountPolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AmountPolicyService],
    }).compile();

    service = module.get<AmountPolicyService>(AmountPolicyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
