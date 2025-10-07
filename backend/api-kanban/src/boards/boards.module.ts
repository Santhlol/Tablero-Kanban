import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BoardSchema } from '../schemas/board.schema';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';
import { ColumnsModule } from '../columns/columns.module';
import { TasksModule } from '../tasks/tasks.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Board', schema: BoardSchema }]),
    ColumnsModule, TasksModule, RealtimeModule,
  ],
  providers: [BoardsService],
  controllers: [BoardsController],
  exports: [BoardsService],
})
export class BoardsModule {}
