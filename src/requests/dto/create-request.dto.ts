import { IsNotEmpty, IsString } from "class-validator"

export class CreateRequestDto {
    @IsString()
        @IsNotEmpty({ message: 'Укажите ID магазина' })
        readonly shopID: string
    
        @IsString()
        @IsNotEmpty({ message: 'Комментарий не может быть пустым' })
        readonly comment: string

        @IsString()
        @IsNotEmpty({ message: 'Нельзя создать заявку без указанного MAC-адреса' })
        readonly macAddress: string
}
