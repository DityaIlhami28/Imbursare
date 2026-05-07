import { Module } from '@nestjs/common';
import { PositionLevelService } from './position-level.service';
import { PositionLevelController } from './position-level.controller';
import { PrismaModule } from 'prisma/prisma.module';


@Module({
  imports: [PrismaModule],
  controllers: [PositionLevelController],
  providers: [PositionLevelService],
})
export class PositionLevelModule {}
