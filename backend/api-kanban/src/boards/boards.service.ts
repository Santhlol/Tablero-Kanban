import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Board } from '../schemas/board.schema';
import { CreateBoardDto } from './dto/create-board.dto';
import { KanbanGateway } from '../realtime/realtime.gateway';
import { RealtimeEvents } from '../realtime/realtime.gateway.types';
import { UpdateBoardDto } from './dto/update-board.dto';
import { ColumnsService } from '../columns/columns.service';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class BoardsService {
  constructor(
    @InjectModel('Board') private model: Model<Board>,
    private events: KanbanGateway,
    private columns: ColumnsService,
    private tasks: TasksService,
  ) {}

  create(dto: CreateBoardDto) {
    return this.model.create(dto).then(doc => {
      this.events.emitToAll(RealtimeEvents.BoardCreated, doc);
      return doc;
    });
  }
  findAll() { return this.model.find().lean(); }
  async findOne(id: string) {
    const doc = await this.model.findById(id).lean();
    if (!doc) throw new NotFoundException('Board not found');
    return doc;
  }
  async update(id: string, dto: UpdateBoardDto) {
    const doc = await this.model.findByIdAndUpdate(id, dto, { new: true, lean: true });
    if (!doc) throw new NotFoundException('Board not found');
    this.events.emitToAll(RealtimeEvents.BoardUpdated, doc);
    return doc;
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id, { lean: true });
    if (!doc) throw new NotFoundException('Board not found');

    await Promise.all([
      this.columns.removeByBoard(id),
      this.tasks.removeByBoard(id),
    ]);

    this.events.emitToAll(RealtimeEvents.BoardDeleted, { id });
    return { id };
  }
}
