import { PartialType } from '@nestjs/mapped-types';
import { CreateRequestDto } from './create-request.dto';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateRequestDto extends PartialType(CreateRequestDto) {
    @IsString()
    @IsNotEmpty({ message: 'Укажите ID магазина' })
    readonly shopID: string

    @IsString()
    @IsNotEmpty({ message: 'Комментарий не может быть пустым' })
    readonly comment: string
}
