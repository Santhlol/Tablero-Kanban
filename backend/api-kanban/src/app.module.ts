import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RealtimeModule } from './realtime/realtime.module';
import { BoardsModule } from './boards/boards.module';
import { ColumnsModule } from './columns/columns.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: (cfg: ConfigService) => ({ uri: cfg.get<string>('MONGODB_URI') }),
      inject: [ConfigService],
    }),
    RealtimeModule,
    BoardsModule,
    ColumnsModule,
    TasksModule,
  ],
})
export class AppModule {}
