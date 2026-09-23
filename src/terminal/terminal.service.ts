import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { linkedShopSelect } from '../shop/shop.service';

@Injectable()
export class TerminalService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.terminal.findMany({
      orderBy: { createdAt: 'asc' },
      include: { shop: { select: linkedShopSelect } },
    });
  }

  async findOne(id: string) {
    const terminal = await this.prisma.terminal.findUnique({
      where: { id },
      include: { shop: { select: linkedShopSelect } },
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
      include: { shop: { select: linkedShopSelect } },
    });
  }

  async heartbeat(macAddress: string) {
    const terminal = await this.prisma.terminal.findUnique({ where: { macAddress } });
    if (!terminal) {
      throw new NotFoundException('Терминал не найден');
    }
    return this.prisma.terminal.update({
      where: { id: terminal.id },
      data: {
        status: 'ACTIVE',
        lastHeartbeatAt: new Date(),
      },
    });
  }
}
