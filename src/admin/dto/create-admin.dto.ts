import {
	IsEmail,
	IsNotEmpty,
	IsString,
	MaxLength,
	MinLength,
} from 'class-validator';

export class CreateAdminDto {
	@IsNotEmpty()
	@IsString()
	@MaxLength(100)
	readonly name: string;

	@IsNotEmpty()
	@IsEmail()
	readonly email: string;

	@IsNotEmpty()
	@IsString()
	@MinLength(8)
	@MaxLength(72)
	readonly password: string;
}
