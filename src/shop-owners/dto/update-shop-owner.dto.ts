import { PartialType } from '@nestjs/mapped-types';
import { CreateShopOwnerDto } from './create-shop-owner.dto';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateShopOwnerDto extends PartialType(CreateShopOwnerDto) {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Имя не может быть пустым' })
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Телефон не может быть пустым' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Некорректный формат email' })
  @IsNotEmpty({ message: 'Email не может быть пустым' })
  email?: string;
}
