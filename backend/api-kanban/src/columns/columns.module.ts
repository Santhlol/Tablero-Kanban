import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ColumnSchema } from '../schemas/column.schema';
import { ColumnsService } from './columns.service';
import { ColumnsController } from './columns.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Column', schema: ColumnSchema }]),
    RealtimeModule,
  ],
  providers: [ColumnsService],
  controllers: [ColumnsController],
  exports: [ColumnsService],
})
export class ColumnsModule {}
