import { IsJWT, IsNotEmpty, IsString } from 'class-validator';

export class ShopRefreshDto {
  @IsNotEmpty()
  @IsString()
  @IsJWT()
  readonly refreshToken: string;
}
