import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TerminalService } from './terminal.service';
import { CreateTerminalDto } from './dto/create-terminal.dto';
import { UpdateTerminalDto } from './dto/update-terminal.dto';

class UpdateStatusDto {
  status: 'ACTIVE' | 'INACTIVE';
}

class HeartbeatDto {
  mac: string;
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

  @Post(':id')
  heartbeat(@Param('id') dto: HeartbeatDto) {
    return this.terminalService.heartbeat(dto.mac);
  }
}
