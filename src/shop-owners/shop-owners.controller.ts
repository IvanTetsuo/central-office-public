import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ShopOwnersService } from './shop-owners.service';
import { CreateShopOwnerDto } from './dto/create-shop-owner.dto';
import { UpdateShopOwnerDto } from './dto/update-shop-owner.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('shop-owners')
@UseGuards(JwtAuthGuard)
export class ShopOwnersController {
  constructor(private readonly shopOwnersService: ShopOwnersService) {}

  @Post()
  create(@Body() createShopOwnerDto: CreateShopOwnerDto) {
    return this.shopOwnersService.create(createShopOwnerDto);
  }

  @Get()
  findAll() {
    return this.shopOwnersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shopOwnersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateShopOwnerDto: UpdateShopOwnerDto) {
    return this.shopOwnersService.update(id, updateShopOwnerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shopOwnersService.remove(id);
  }
}
