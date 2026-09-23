import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCommentDto } from './dto/add-comment.dto';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.terminalRequest.findMany({
      orderBy: { createdAt: 'asc' },
      include: { shop: true },
    });
  }

  async approve(id: string, dto?: { macAddress?: string }) {
    const request = await this.prisma.terminalRequest.findUnique({
      where: { id },
      include: { shop: true },
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

    const terminal = await this.prisma.terminal.upsert({
      where: { macAddress },
      update: { status: 'ACTIVE', shopId: request.shopId },
      create: { macAddress, status: 'ACTIVE', shopId: request.shopId },
    });

    const updated = await this.prisma.terminalRequest.update({
      where: { id },
      data: { status: 'APPROVED', comment: request.comment || 'Approved' },
      include: { shop: true },
    });

    return { terminal, request: updated };
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