import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Column } from '../schemas/column.schema';
import { CreateColumnDto } from './dto/create-column.dto';
import { KanbanGateway } from '../realtime/realtime.gateway';

@Injectable()
export class ColumnsService {
  constructor(
    @InjectModel('Column') private model: Model<Column>,
    private events: KanbanGateway,
  ) {}
  create(dto: CreateColumnDto) {
    return this.model.create(dto).then(doc => {
      this.events.emitToBoard(String(doc.boardId), 'column.created', doc);
      return doc;
    });
  }
  findByBoard(boardId: string) { return this.model.find({ boardId }).sort({ position: 1 }).lean(); }
  update(id: string, data: Partial<Column>) {
    return this.model.findByIdAndUpdate(id, data, { new: true }).then(doc => {
      if (doc) this.events.emitToBoard(String(doc.boardId), 'column.updated', doc);
      return doc;
    });
  }
  remove(id: string) {
    return this.model.findByIdAndDelete(id).then(doc => {
      if (doc) this.events.emitToBoard(String(doc.boardId), 'column.deleted', { id, boardId: doc.boardId });
      return doc;
    });
  }
}
