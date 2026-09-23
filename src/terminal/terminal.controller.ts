import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { TerminalService } from './terminal.service';

class UpdateStatusDto {
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE'], { message: 'Статус должен быть ACTIVE или INACTIVE' })
  status: 'ACTIVE' | 'INACTIVE';
}

class HeartbeatDto {
  @IsString()
  @IsNotEmpty({ message: 'MAC-адрес не может быть пустым' })
  macAddress: string;
}

@Controller('terminal')
export class TerminalController {
  constructor(private readonly terminalService: TerminalService) {}

  @Get()
  findAll() {
    return this.terminalService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.terminalService.findOne(id);
  }

  @Patch(':id/status')
  update(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.terminalService.updateStatus(id, dto.status);
  }

  @Post('alive')
  heartbeat(@Body() dto: HeartbeatDto) {
    return this.terminalService.heartbeat(dto.macAddress);
  }
}
