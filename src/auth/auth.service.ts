import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Admin, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser, JwtPayload } from './auth.types';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const admin = await this.prisma.admin.findUnique({ where: { email } });

    if (!admin || !(await bcrypt.compare(dto.password, admin.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.prisma.$transaction(async (transaction) => {
      await transaction.session.deleteMany({ where: { adminId: admin.id } });
      const session = await transaction.session.create({
        data: {
          adminId: admin.id,
          refreshTokenHash: '',
          expiresAt: this.expiresFromNow(REFRESH_TTL_SECONDS),
        },
      });

      const issuedTokens = await this.issueTokens(admin, session.id);
      await transaction.session.update({
        where: { id: session.id },
        data: { refreshTokenHash: await bcrypt.hash(issuedTokens.refreshToken, 12) },
      });

      return issuedTokens;
    });

    return this.publicTokenResponse(tokens, admin);
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;

    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { admin: true },
    });

    if (
      !session ||
      session.adminId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !(await bcrypt.compare(refreshToken, session.refreshTokenHash))
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.issueTokens(session.admin, session.id);
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 12),
        createdAt: new Date(),
        expiresAt: this.expiresFromNow(REFRESH_TTL_SECONDS),
      },
    });

    return this.publicTokenResponse(tokens, session.admin);
  }

  async logout(user: AuthenticatedUser): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: user.sessionId, adminId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async validateAccessPayload(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { admin: true },
    });

    if (
      !session ||
      session.adminId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Session is invalid or expired');
    }

    return {
      id: session.admin.id,
      email: session.admin.email,
      name: session.admin.name,
      role: session.admin.role,
      sessionId: session.id,
    };
  }

  private async issueTokens(admin: Admin, sessionId: string) {
    const basePayload = {
      sub: admin.id,
      sessionId,
      role: admin.role,
    };

    const accessToken = await this.jwt.signAsync(
      { ...basePayload, type: 'access' },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: ACCESS_TTL_SECONDS,
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { ...basePayload, type: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TTL_SECONDS,
      },
    );

    return { accessToken, refreshToken };
  }

  private publicTokenResponse(
    tokens: { accessToken: string; refreshToken: string },
    admin: Admin,
  ) {
    return {
      ...tokens,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TTL_SECONDS,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    };
  }

  private expiresFromNow(seconds: number): Date {
    return new Date(Date.now() + seconds * 1000);
  }
}