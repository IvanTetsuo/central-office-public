import {
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsPhoneNumber,
	IsString,
	MaxLength,
	MinLength,
} from 'class-validator';

export class CreateShopDto {
    @IsString()
    @IsNotEmpty({ message: 'id не может быть пустой строкой' })
    readonly ownerId: string

    @IsNotEmpty()
	@IsString()
	@MaxLength(100)
    readonly name: string

    @IsNotEmpty()
	@IsString()
	@MaxLength(100)
    readonly address: string

    @IsNotEmpty()
	@IsString()
	@MaxLength(100)
    readonly requisites: string

    @IsNotEmpty()
	@IsString()
	@MaxLength(100)
    readonly login: string

    @IsNotEmpty()
	@IsString()
	@MinLength(8)
	@MaxLength(72)
    readonly password: string
}
