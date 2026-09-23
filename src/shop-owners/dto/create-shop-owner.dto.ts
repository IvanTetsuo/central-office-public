import {
	IsEmail,
	IsNotEmpty,
	IsPhoneNumber,
	IsString,
	MaxLength,
	MinLength,
} from 'class-validator';

export class CreateShopOwnerDto {
    @IsNotEmpty()
	@IsString()
	@MaxLength(100)
	readonly firstName: string;

    @IsNotEmpty()
	@IsString()
	@MaxLength(100)
	readonly lastName: string;

    @IsNotEmpty()
	@IsPhoneNumber()
	readonly phone: string;

	@IsNotEmpty()
	@IsEmail()
	readonly email: string;

	@IsString()
	@MaxLength(100)
	readonly address: string;
}