import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateShopDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(72)
    readonly login: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    readonly password: string;
}
