import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ShopLoginDto } from './dto/shop-login.dto';
import { ShopRefreshDto } from './dto/shop-refresh.dto';
import { ShopAuthService } from './shop-auth.service';
import { AuthenticatedShop } from './shop-auth.types';
import { ShopJwtGuard } from './shop-jwt.guard';

type AuthenticatedShopRequest = Request & { user: AuthenticatedShop };

@Controller('shop-auth')
export class ShopAuthController {
  constructor(private readonly shopAuthService: ShopAuthService) {}

  @Post('login')
  login(@Body() dto: ShopLoginDto) {
    return this.shopAuthService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: ShopRefreshDto) {
    return this.shopAuthService.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(ShopJwtGuard)
  me(@Req() request: AuthenticatedShopRequest) {
    return request.user;
  }

  @Post('logout')
  @UseGuards(ShopJwtGuard)
  async logout(@Req() request: AuthenticatedShopRequest) {
    await this.shopAuthService.logout(request.user);
    return { success: true };
  }
}
