import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ShopService } from './shop.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ShopJwtGuard } from '../shop-auth/shop-jwt.guard';
import { ShopOwnsParamGuard } from '../shop-auth/shop-owns-param.guard';

@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createShopDto: CreateShopDto) {
    return this.shopService.create(createShopDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.shopService.findAll();
  }

  @Get(':id')
  @UseGuards(ShopJwtGuard, ShopOwnsParamGuard)
  findOne(@Param('id') id: string) {
    return this.shopService.findOne(id);
  }

  @Patch(':id/credentials')
  @UseGuards(ShopJwtGuard, ShopOwnsParamGuard)
  update(@Param('id') id: string, @Body() updateShopDto: UpdateShopDto) {
    return this.shopService.update(id, updateShopDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.shopService.remove(id);
  }
}
