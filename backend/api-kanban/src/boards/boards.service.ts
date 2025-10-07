import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Board } from '../schemas/board.schema';
import { CreateBoardDto } from './dto/create-board.dto';
import { ColumnsService } from '../columns/columns.service';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class BoardsService {
  constructor(
    @InjectModel('Board') private model: Model<Board>,
    private columns: ColumnsService,
    private tasks: TasksService,
  ) {}

  create(dto: CreateBoardDto) {
    return this.model.create(dto);
  }
  findAll() {
    return this.model.find().lean();
  }
  async findOne(id: string) {
    const doc = await this.model.findById(id).lean();
    if (!doc) throw new NotFoundException('Board not found');
    return doc;
  }
  async remove(id: string) {
    const board = await this.model.findById(id);
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    await this.tasks.removeByBoard(id);
    await this.columns.removeByBoard(id);
    await this.model.deleteOne({ _id: id });

    return board.toObject();
  }
}
