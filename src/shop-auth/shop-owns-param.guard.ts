import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedShop } from './shop-auth.types';

type ShopRequest = Request & { user?: AuthenticatedShop };

@Injectable()
export class ShopOwnsParamGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ShopRequest>();
    const shopId = request.user?.shopId;

    if (!shopId || shopId !== request.params.id) {
      throw new ForbiddenException('Можно работать только со своим магазином');
    }

    return true;
  }
}
