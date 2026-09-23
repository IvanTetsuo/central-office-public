import { createHash } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Shop } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ShopLoginDto } from './dto/shop-login.dto';
import { AuthenticatedShop, ShopJwtPayload } from './shop-auth.types';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class ShopAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: ShopLoginDto) {
    const login = dto.login.trim().toLowerCase();
    const shop = await this.prisma.shop.findUnique({ where: { login } });

    if (!shop || !(await bcrypt.compare(dto.password, shop.passwordHash))) {
      throw new UnauthorizedException('Invalid shop login or password');
    }

    const tokens = await this.prisma.$transaction(async (transaction) => {
      await transaction.shopSession.deleteMany({ where: { shopId: shop.id } });
      const session = await transaction.shopSession.create({
        data: {
          shopId: shop.id,
          refreshTokenHash: '',
          expiresAt: this.expiresFromNow(REFRESH_TTL_SECONDS),
        },
      });

      const issuedTokens = await this.issueTokens(shop, session.id);
      await transaction.shopSession.update({
        where: { id: session.id },
        data: {
          refreshTokenHash: await this.hashRefreshToken(issuedTokens.refreshToken),
        },
      });

      return issuedTokens;
    });

    return this.publicTokenResponse(tokens, shop);
  }

  async refresh(refreshToken: string) {
    let payload: ShopJwtPayload;

    try {
      payload = await this.jwt.verifyAsync<ShopJwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('SHOP_JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid shop refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid shop refresh token');
    }

    const session = await this.prisma.shopSession.findUnique({
      where: { id: payload.sessionId },
      include: { shop: true },
    });

    if (
      !session ||
      session.shopId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !(await this.matchesRefreshToken(refreshToken, session.refreshTokenHash))
    ) {
      throw new UnauthorizedException('Invalid shop refresh token');
    }

    const tokens = await this.issueTokens(session.shop, session.id);
    await this.prisma.shopSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: await this.hashRefreshToken(tokens.refreshToken),
        createdAt: new Date(),
        expiresAt: this.expiresFromNow(REFRESH_TTL_SECONDS),
      },
    });

    return this.publicTokenResponse(tokens, session.shop);
  }

  async logout(user: AuthenticatedShop): Promise<void> {
    await this.prisma.shopSession.updateMany({
      where: { id: user.sessionId, shopId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async validateAccessPayload(payload: ShopJwtPayload): Promise<AuthenticatedShop> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid shop access token');
    }

    const session = await this.prisma.shopSession.findUnique({
      where: { id: payload.sessionId },
      include: { shop: true },
    });

    if (
      !session ||
      session.shopId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Shop session is invalid or expired');
    }

    return {
      id: session.shop.id,
      shopId: session.shop.id,
      login: session.shop.login,
      ownerId: session.shop.ownerId,
      sessionId: session.id,
    };
  }

  private async issueTokens(shop: Shop, sessionId: string) {
    const basePayload = {
      sub: shop.id,
      sessionId,
      ownerId: shop.ownerId,
    };

    const accessToken = await this.jwt.signAsync(
      { ...basePayload, type: 'access' },
      {
        secret: this.config.getOrThrow<string>('SHOP_JWT_ACCESS_SECRET'),
        expiresIn: ACCESS_TTL_SECONDS,
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { ...basePayload, type: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('SHOP_JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TTL_SECONDS,
      },
    );

    return { accessToken, refreshToken };
  }

  private publicTokenResponse(
    tokens: { accessToken: string; refreshToken: string },
    shop: Shop,
  ) {
    return {
      ...tokens,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TTL_SECONDS,
      shop: {
        id: shop.id,
        login: shop.login,
        ownerId: shop.ownerId,
        name: shop.name,
      },
    };
  }

  private expiresFromNow(seconds: number): Date {
    return new Date(Date.now() + seconds * 1000);
  }

  private hashRefreshToken(token: string): Promise<string> {
    return bcrypt.hash(this.refreshTokenDigest(token), 12);
  }

  private matchesRefreshToken(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(this.refreshTokenDigest(token), hash);
  }

  private refreshTokenDigest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
