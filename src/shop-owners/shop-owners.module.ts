import { Module } from '@nestjs/common';
import { ShopOwnersService } from './shop-owners.service';
import { ShopOwnersController } from './shop-owners.controller';

@Module({
  controllers: [ShopOwnersController],
  providers: [ShopOwnersService],
})
export class ShopOwnersModule {}
