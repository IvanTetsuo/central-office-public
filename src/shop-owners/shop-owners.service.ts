import { 
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { CreateShopOwnerDto } from './dto/create-shop-owner.dto';
import { UpdateShopOwnerDto } from './dto/update-shop-owner.dto';
import { PrismaService } from '../prisma/prisma.service';
import { publicShopSelect } from '../shop/shop.service';

@Injectable()
export class ShopOwnersService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createShopOwnerDto: CreateShopOwnerDto) {
    const email = createShopOwnerDto.email.trim().toLowerCase();
    const existingShopOwner = await this.prisma.shopOwner.findUnique({
      where: { email },
    });
    
    if (existingShopOwner) {
      throw new ConflictException('ShopOwner email is already in use');
    }
    return this.prisma.shopOwner.create({
      data: createShopOwnerDto
    });
  }

  findAll() {
    return this.prisma.shopOwner.findMany({
      orderBy: {createdAt: 'asc'},
      include: { shops: { select: publicShopSelect } },
    });
  }

  async findOne(id: string) {
    const shopOwner = await this.prisma.shopOwner.findUnique({
      where: {id},
    });

    if (!shopOwner) {
      throw new NotFoundException('Владелец магазина не найден');
    }
    return shopOwner;
  }

  async update(id: string, data: UpdateShopOwnerDto) {
    return this.prisma.shopOwner.update({where: {id}, data});
  }

  async remove(id: string) {
    await this.findOne(id);
    const shops = await this.prisma.shop.count({ where: { ownerId: id } });
    if (shops > 0) {
      throw new BadRequestException('Нельзя удалить владельца магазина, у которого имеются магазины');
    }
    await this.prisma.shopOwner.delete({ where: { id } });
    return { success: true };
  }
}
