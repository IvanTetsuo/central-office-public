import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Admin, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminPasswordDto } from './dto/update-admin-password.dto';
import { PrismaService } from '../prisma/prisma.service';

const publicAdminSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createAdminDto: CreateAdminDto,
  ): Promise<Omit<Admin, 'passwordHash'>> {

    const email = createAdminDto.email.trim().toLowerCase();
    const existingAdmin = await this.prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      throw new ConflictException('Administrator email is already in use');
    }

    const passwordHash = await bcrypt.hash(createAdminDto.password, 12);

    return this.prisma.admin.create({
      data: {
        name: createAdminDto.name.trim(),
        email,
        passwordHash,
        role: AdminRole.MANAGER,
      },
      select: publicAdminSelect,
    });
  }

  findAll() {
    return this.prisma.admin.findMany({
      select: publicAdminSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string): Promise<Omit<Admin, 'passwordHash'>> {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      select: publicAdminSelect,
    });

    if (!admin) {
      throw new NotFoundException('Administrator not found');
    }

    return admin;
  }

  async updatePassword(
    id: string,
    passwordDto: UpdateAdminPasswordDto,
  ): Promise<Omit<Admin, 'passwordHash'>> {

    const admin = await this.findOneWithPassword(id);
    const passwordHash = await bcrypt.hash(passwordDto.password, 12);

    await this.prisma.session.deleteMany({ where: { adminId: admin.id } });

    return this.prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash },
      select: publicAdminSelect,
    });
  }

  async remove(id: string): Promise<void> {

    const admin = await this.findOneWithPassword(id);

    if (admin.role === AdminRole.ROOT) {
      throw new ForbiddenException('The root administrator cannot be deleted');
    }

    await this.prisma.admin.delete({ where: { id: admin.id } });
  }

  private async findOneWithPassword(id: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id } });

    if (!admin) {
      throw new NotFoundException('Administrator not found');
    }

    return admin;
  }
}
