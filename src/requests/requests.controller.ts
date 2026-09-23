import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { RequestsService } from './requests.service';
import { AddCommentDto } from './dto/add-comment.dto';

class ApproveRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'MAC-адрес не может быть пустым' })
  macAddress: string;
}

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  list() {
    return this.requestsService.findAll();
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApproveRequestDto) {
    return this.requestsService.approve(id, dto);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.requestsService.reject(id);
  }

  @Post(':id/comment')
  addComment(@Param('id') id: string, @Body() dto: AddCommentDto) {
    return this.requestsService.addComment(id, dto);
  }
}
