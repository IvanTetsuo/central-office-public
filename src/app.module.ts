import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ShopOwnersModule } from './shop-owners/shop-owners.module';
import { ShopModule } from './shop/shop.module';
import { TerminalModule } from './terminal/terminal.module';
import { RequestsModule } from './requests/requests.module';
import { ProfileModule } from './profile/profile.module';
import { ShopAuthModule } from './shop-auth/shop-auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AdminModule,
    AuthModule,
    ShopModule,
    ShopOwnersModule,
    TerminalModule,
    RequestsModule,
    ProfileModule,
    ShopAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
