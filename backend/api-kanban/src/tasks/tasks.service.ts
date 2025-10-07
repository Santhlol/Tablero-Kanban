import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from '../schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { KanbanGateway } from '../realtime/realtime.gateway';
import { RealtimeEvents } from '../realtime/realtime.gateway.types';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel('Task') private model: Model<Task>,
    private events: KanbanGateway,
  ) {}

  create(dto: CreateTaskDto) {
    return this.model.create(dto).then(doc => {
      this.events.emitToBoard(String(doc.boardId), RealtimeEvents.TaskCreated, doc);
      return doc;
    });
  }

  findByBoard(boardId: string) { return this.model.find({ boardId }).lean(); }
  findByColumn(columnId: string) { return this.model.find({ columnId }).sort({ position: 1 }).lean(); }

  update(id: string, data: Partial<Task>) {
    return this.model.findByIdAndUpdate(id, data, { new: true }).then(doc => {
      if (doc) this.events.emitToBoard(String(doc.boardId), RealtimeEvents.TaskUpdated, doc);
      return doc;
    });
  }

  move(id: string, dto: MoveTaskDto) {
    return this.model.findByIdAndUpdate(id, dto, { new: true }).then(doc => {
      if (doc) this.events.emitToBoard(String(doc.boardId), RealtimeEvents.TaskMoved, doc);
      return doc;
    });
  }

  remove(id: string) {
    return this.model.findByIdAndDelete(id).then(doc => {
      if (doc) this.events.emitToBoard(String(doc.boardId), RealtimeEvents.TaskDeleted, { id, columnId: doc.columnId });
      return doc;
    });
  }

  async removeByBoard(boardId: string) {
    await this.model.deleteMany({ boardId });
  }
}
