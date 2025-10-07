import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from '../schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { KanbanGateway } from '../realtime/realtime.gateway';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel('Task') private model: Model<Task>,
    private events: KanbanGateway,
  ) {}

  create(dto: CreateTaskDto) {
    return this.model.create(dto).then((doc) => {
      this.events.emitToBoard(String(doc.boardId), 'task.created', doc);
      return doc;
    });
  }

  findByBoard(boardId: string) {
    return this.model.find({ boardId }).lean();
  }
  findByColumn(columnId: string) {
    return this.model.find({ columnId }).sort({ position: 1 }).lean();
  }

  async update(id: string, data: UpdateTaskDto) {
    const doc = await this.model.findByIdAndUpdate(id, data, { new: true });
    if (!doc) {
      throw new NotFoundException('Task not found');
    }
    this.events.emitToBoard(String(doc.boardId), 'task.updated', doc);
    return doc;
  }

  async move(id: string, dto: MoveTaskDto) {
    const doc = await this.model.findByIdAndUpdate(id, dto, { new: true });
    if (!doc) {
      throw new NotFoundException('Task not found');
    }
    this.events.emitToBoard(String(doc.boardId), 'task.moved', doc);
    return doc;
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id);
    if (!doc) {
      throw new NotFoundException('Task not found');
    }
    this.events.emitToBoard(String(doc.boardId), 'task.deleted', {
      id,
      columnId: doc.columnId,
    });
    return doc;
  }

  async removeByBoard(boardId: string) {
    const tasks = await this.model.find({ boardId }).lean();
    if (!tasks.length) {
      return 0;
    }
    await this.model.deleteMany({ boardId });
    tasks.forEach((task) => {
      const board = String(task.boardId);
      this.events.emitToBoard(board, 'task.deleted', {
        id: String(task._id),
        columnId: String(task.columnId),
      });
    });
    return tasks.length;
  }
}
