import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedShop, ShopJwtPayload } from './shop-auth.types';
import { ShopAuthService } from './shop-auth.service';

@Injectable()
export class ShopJwtStrategy extends PassportStrategy(Strategy, 'shop-jwt') {
  constructor(
    config: ConfigService,
    private readonly shopAuthService: ShopAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('SHOP_JWT_ACCESS_SECRET'),
      algorithms: ['HS256'],
    });
  }

  validate(payload: ShopJwtPayload): Promise<AuthenticatedShop> {
    return this.shopAuthService.validateAccessPayload(payload);
  }
}
