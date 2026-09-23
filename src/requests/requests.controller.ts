import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { AddCommentDto } from './dto/add-comment.dto';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  list() {
    return this.requestsService.findAll();
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body() dto?: { macAddress?: string }) {
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
