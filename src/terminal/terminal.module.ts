import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TerminalService } from './terminal.service';
import { TerminalController } from './terminal.controller';

@Module({
  imports: [AuthModule],
  controllers: [TerminalController],
  providers: [TerminalService],
})
export class TerminalModule {}
