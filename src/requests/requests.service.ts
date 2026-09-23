import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { linkedShopSelect } from '../shop/shop.service';
import { publicTerminalSelect } from '../terminal/terminal.service';
import { AddCommentDto } from './dto/add-comment.dto';
import { CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRequestDto) {
    const shopId = dto.shopId.trim();
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Магазин не найден');
    }

    return this.prisma.terminalRequest.create({
      data: {
        shopId,
        macAddress: dto.macAddress.trim(),
        comment: dto.comment.trim(),
      },
      include: { shop: { select: linkedShopSelect } },
    });
  }

  async findAll() {
    return this.prisma.terminalRequest.findMany({
      orderBy: { createdAt: 'asc' },
      include: { shop: { select: linkedShopSelect } },
    });
  }

  async approve(id: string, dto: { macAddress: string }) {
    const macAddress = dto.macAddress.trim();

    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.terminalRequest.findUnique({
        where: { id },
        include: { shop: { select: linkedShopSelect } },
      });

      if (!request) {
        throw new NotFoundException('Заявка не найдена');
      }

      if (request.status === 'REJECTED') {
        throw new ConflictException('Отклонённую заявку нельзя одобрить');
      }

      if (request.status === 'APPROVED') {
        const terminal = await transaction.terminal.findUnique({
          where: { macAddress: request.macAddress },
          select: publicTerminalSelect,
        });
        if (!terminal) {
          throw new NotFoundException('Терминал не найден');
        }
        return { terminal, request };
      }

      const existingTerminal = await transaction.terminal.findUnique({
        where: { macAddress },
      });
      if (existingTerminal) {
        throw new BadRequestException('MAC-адрес не является уникальным');
      }

      const secret = randomBytes(32).toString('base64url');
      const secretHash = await bcrypt.hash(secret, 12);
      const terminal = await transaction.terminal.create({
        data: {
          macAddress,
          status: 'INACTIVE',
          shopId: request.shopId,
          secretHash,
        },
        select: publicTerminalSelect,
      });
      const updated = await transaction.terminalRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          macAddress,
          comment: request.comment || 'Approved',
        },
        include: { shop: { select: linkedShopSelect } },
      });

      return { terminal: { ...terminal, secret }, request: updated };
    });
  }

  async reject(id: string) {
    const request = await this.prisma.terminalRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Заявка не найдена');
    }

    if (request.status === 'APPROVED') {
      throw new ConflictException('Одобренную заявку нельзя отклонить');
    }

    if (request.status === 'REJECTED') {
      throw new ConflictException('Заявка уже отклонена');
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