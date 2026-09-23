import { randomBytes } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { linkedShopSelect } from '../shop/shop.service';
import { publicTerminalSelect } from '../terminal/terminal.service';
import { AddCommentDto } from './dto/add-comment.dto';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.terminalRequest.findMany({
      orderBy: { createdAt: 'asc' },
      include: { shop: { select: linkedShopSelect } },
    });
  }

  async approve(id: string, dto?: { macAddress?: string }) {
    const request = await this.prisma.terminalRequest.findUnique({
      where: { id },
      include: { shop: { select: linkedShopSelect } },
    });

    if (!request) {
      throw new NotFoundException('Заявка не была получена');
    }

    const macAddress = dto?.macAddress ?? request.macAddress;
    const existingMacAddress = await this.prisma.terminal.findUnique({ where: { macAddress } });

    if (existingMacAddress && existingMacAddress.shopId !== request.shopId) {
      throw new BadRequestException('MAC-адрес не является уникальным');
    }

    if (request.status === 'APPROVED') {
      return request;
    }

    const secret = randomBytes(32).toString('base64url');
    const secretHash = await bcrypt.hash(secret, 12);
    const terminal = await this.prisma.terminal.upsert({
      where: { macAddress },
      update: { status: 'ACTIVE', shopId: request.shopId, secretHash },
      create: { macAddress, status: 'ACTIVE', shopId: request.shopId, secretHash },
      select: publicTerminalSelect,
    });

    const updated = await this.prisma.terminalRequest.update({
      where: { id },
      data: { status: 'APPROVED', comment: request.comment || 'Approved' },
      include: { shop: { select: linkedShopSelect } },
    });

    return { terminal: { ...terminal, secret }, request: updated };
  }

  async reject(id: string) {
    const request = await this.prisma.terminalRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Заявка не найдена');
    }

    return this.prisma.terminalRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }

  async addComment(id: string, data: AddCommentDto) {
    const request = await this.prisma.terminalRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Заявка не найдена');
    }

    return this.prisma.terminalRequest.update({
      where: { id },
      data: {
        comment: data.comment,
      },
    });
  }
}