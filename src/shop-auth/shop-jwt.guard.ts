import { AuthGuard } from '@nestjs/passport';

export const ShopJwtGuard = AuthGuard('shop-jwt');
