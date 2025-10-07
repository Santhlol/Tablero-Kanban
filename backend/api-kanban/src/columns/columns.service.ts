import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Column } from '../schemas/column.schema';
import { CreateColumnDto } from './dto/create-column.dto';
import { KanbanGateway } from '../realtime/realtime.gateway';
import { UpdateColumnDto } from './dto/update-column.dto';

@Injectable()
export class ColumnsService {
  constructor(
    @InjectModel('Column') private model: Model<Column>,
    private events: KanbanGateway,
  ) {}
  create(dto: CreateColumnDto) {
    return this.model.create(dto).then((doc) => {
      this.events.emitToBoard(String(doc.boardId), 'column.created', doc);
      return doc;
    });
  }
  findByBoard(boardId: string) {
    return this.model.find({ boardId }).sort({ position: 1 }).lean();
  }
  async update(id: string, data: UpdateColumnDto) {
    const doc = await this.model.findByIdAndUpdate(id, data, { new: true });
    if (!doc) {
      throw new NotFoundException('Column not found');
    }
    this.events.emitToBoard(String(doc.boardId), 'column.updated', doc);
    return doc;
  }
  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id);
    if (!doc) {
      throw new NotFoundException('Column not found');
    }
    this.events.emitToBoard(String(doc.boardId), 'column.deleted', {
      id,
      boardId: doc.boardId,
    });
    return doc;
  }
  async removeByBoard(boardId: string) {
    const columns = await this.model.find({ boardId }).lean();
    if (!columns.length) {
      return 0;
    }
    await this.model.deleteMany({ boardId });
    columns.forEach((column) => {
      const board = String(column.boardId);
      this.events.emitToBoard(board, 'column.deleted', {
        id: String(column._id),
        boardId: board,
      });
    });
    return columns.length;
  }
}
