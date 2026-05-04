import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from 'prisma/prisma.module';
import { CompanyModule } from './company/company.module';
import { CategoryModule } from './category/category.module';

@Module({
  imports: [UserModule, AuthModule, PrismaModule, CompanyModule, CategoryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
