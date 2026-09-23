import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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

  @IsString()
  @IsNotEmpty({ message: 'Секрет терминала не может быть пустым' })
  secret: string;
}

@Controller('terminal')
export class TerminalController {
  constructor(private readonly terminalService: TerminalService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.terminalService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.terminalService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.terminalService.updateStatus(id, dto.status);
  }

  @Post('alive')
  heartbeat(@Body() dto: HeartbeatDto) {
    return this.terminalService.heartbeat(dto.macAddress, dto.secret);
  }
}
