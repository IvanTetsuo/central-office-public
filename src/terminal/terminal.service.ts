import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { linkedShopSelect } from '../shop/shop.service';

export const publicTerminalSelect = {
  id: true,
  shopId: true,
  macAddress: true,
  status: true,
  lastHeartbeatAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const publicTerminalWithShopSelect = {
  ...publicTerminalSelect,
  shop: { select: linkedShopSelect },
} as const;

@Injectable()
export class TerminalService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.terminal.findMany({
      orderBy: { createdAt: 'asc' },
      select: publicTerminalWithShopSelect,
    });
  }

  async findOne(id: string) {
    const terminal = await this.prisma.terminal.findUnique({
      where: { id },
      select: publicTerminalWithShopSelect,
    });
    if (!terminal) {
      throw new NotFoundException('Терминал не найден');
    }
    return terminal;
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
    await this.findOne(id);
    return this.prisma.terminal.update({
      where: { id },
      data: {
        status,
        lastHeartbeatAt: new Date(),
      },
      select: publicTerminalWithShopSelect,
    });
  }

  async heartbeat(macAddress: string, secret: string) {
    const terminal = await this.prisma.terminal.findUnique({
      where: { macAddress },
      select: { id: true, secretHash: true },
    });
    if (!terminal) {
      throw new NotFoundException('Терминал не найден');
    }

    const secretMatches = await bcrypt.compare(secret, terminal.secretHash).catch(() => false);
    if (!secretMatches) {
      throw new UnauthorizedException('Неверный секрет терминала');
    }

    return this.prisma.terminal.update({
      where: { id: terminal.id },
      data: {
        status: 'ACTIVE',
        lastHeartbeatAt: new Date(),
      },
      select: publicTerminalSelect,
    });
  }
}
