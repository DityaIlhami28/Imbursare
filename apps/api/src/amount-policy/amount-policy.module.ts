import { Module } from '@nestjs/common';
import { AmountPolicyService } from './amount-policy.service';
import { AmountPolicyController } from './amount-policy.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AmountPolicyController],
  providers: [AmountPolicyService],
})
export class AmountPolicyModule {}
