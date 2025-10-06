import { Module } from '@nestjs/common';
import { KanbanGateway } from './realtime.gateway';

@Module({ providers: [KanbanGateway], exports: [KanbanGateway] })
export class RealtimeModule {}
