import { Test, TestingModule } from '@nestjs/testing';
import { AmountPolicyController } from './amount-policy.controller';
import { AmountPolicyService } from './amount-policy.service';

describe('AmountPolicyController', () => {
  let controller: AmountPolicyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AmountPolicyController],
      providers: [AmountPolicyService],
    }).compile();

    controller = module.get<AmountPolicyController>(AmountPolicyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
