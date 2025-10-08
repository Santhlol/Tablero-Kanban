import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { BoardsModule } from '../boards/boards.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [HttpModule, BoardsModule, RealtimeModule],
  controllers: [ExportsController],
  providers: [ExportsService],
  exports: [ExportsService],
})
export class ExportsModule {}
