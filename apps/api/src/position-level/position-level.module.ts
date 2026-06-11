import { Module } from '@nestjs/common';
import { PositionService } from './position-level.service';
import { PositionLevelController } from './position-level.controller';
import { PrismaModule } from 'prisma/prisma.module';


@Module({
  imports: [PrismaModule],
  controllers: [PositionLevelController],
  providers: [PositionService],
})
export class PositionLevelModule {}
