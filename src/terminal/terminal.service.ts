import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTerminalDto } from './dto/create-terminal.dto';
import { UpdateTerminalDto } from './dto/update-terminal.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TerminalService {
  constructor(private readonly prisma: PrismaService) {}
  // create(createTerminalDto: CreateTerminalDto) {
  //   return 'This action adds a new terminal';
  // }

  findAll() {
    return this.prisma.terminal.findMany({
      orderBy: { createdAt: 'asc' },
      include: { shop: true },
    });
  }

  async findOne(id: string) {
    const terminal = await this.prisma.terminal.findUnique({
      where: { id },
      include: { shop: true },
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
      include: { shop: true },
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
        lastSeen: new Date(),
      },
      include: { shop: true },
    });
  }
}
