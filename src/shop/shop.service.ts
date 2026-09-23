import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createShopDto: CreateShopDto) {
    const login = createShopDto.login.trim().toLowerCase();
    const ownerId = createShopDto.ownerId.trim();

    const existing = await this.prisma.shop.findUnique({ where: { login } });
    if (existing) {
      throw new BadRequestException('Логин магазина уже занят');
    }

    const owner = await this.prisma.shopOwner.findUnique({ where: { id: ownerId } });
    if (!owner) {
      throw new BadRequestException('Owner not found');
    }

    const passwordHash = await bcrypt.hash(createShopDto.password, 12);

    return this.prisma.shop.create({
      data: {
        name: createShopDto.name.trim(),
        address: createShopDto.address.trim(),
        requisites: createShopDto.requisites?.trim() || null,
        login,
        passwordHash,
        ownerId,
      },
      include: { owner: true },
    });
  }

  findAll() {
    return this.prisma.shop.findMany({
      orderBy: { createdAt: 'asc' },
      include: { owner: true },
    });
  }

  async findOne(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!shop) {
      throw new NotFoundException('Магазин не найден');
    }

    return shop;
  }

  async update(id: string, updateShopDto: UpdateShopDto) {
    const shop = await this.findOne(id);
    const login = updateShopDto.login?.trim().toLowerCase() ?? shop.login;

    if (login !== shop.login) {
      const conflict = await this.prisma.shop.findUnique({ where: { login } });
      if (conflict && conflict.id !== id) {
        throw new BadRequestException('Логин магазина уже занят');
      }
    }

    const passwordHash = updateShopDto.password
      ? await bcrypt.hash(updateShopDto.password, 12)
      : shop.passwordHash;

    return this.prisma.shop.update({
      where: { id },
      data: {
        login,
        passwordHash,
      },
      include: { owner: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.shop.delete({
      where: { id },
      include: { owner: true },
    });
  }
}
