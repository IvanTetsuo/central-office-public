import { IsNotEmpty, IsString } from 'class-validator';

export class ShopLoginDto {
  @IsNotEmpty()
  @IsString()
  readonly login: string;

  @IsNotEmpty()
  @IsString()
  readonly password: string;
}
