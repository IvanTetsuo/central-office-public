import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ShopAuthController } from './shop-auth.controller';
import { ShopAuthService } from './shop-auth.service';
import { ShopJwtStrategy } from './shop-jwt.strategy';

@Module({
  imports: [JwtModule.register({}), PassportModule],
  controllers: [ShopAuthController],
  providers: [ShopAuthService, ShopJwtStrategy],
  exports: [ShopAuthService, ShopJwtStrategy],
})
export class ShopAuthModule {}
