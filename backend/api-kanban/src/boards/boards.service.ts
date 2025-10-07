import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Board } from '../schemas/board.schema';
import { CreateBoardDto } from './dto/create-board.dto';
import { KanbanGateway } from '../realtime/realtime.gateway';
import { RealtimeEvents } from '../realtime/realtime.gateway.types';

@Injectable()
export class BoardsService {
  constructor(
    @InjectModel('Board') private model: Model<Board>,
    private events: KanbanGateway,
  ) {}

  create(dto: CreateBoardDto) {
    return this.model.create(dto).then(doc => {
      this.events.emitToBoard(String(doc._id), RealtimeEvents.BoardCreated, doc);
      return doc;
    });
  }
  findAll() { return this.model.find().lean(); }
  async findOne(id: string) {
    const doc = await this.model.findById(id).lean();
    if (!doc) throw new NotFoundException('Board not found');
    return doc;
  }
  remove(id: string) { return this.model.findByIdAndDelete(id); }
}
