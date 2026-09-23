import { IsNotEmpty, IsString } from 'class-validator';

export class AddCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'Комментарий не может быть пустым' })
  readonly comment: string;
}
