import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Board } from '../schemas/board.schema';
import { CreateBoardDto } from './dto/create-board.dto';

@Injectable()
export class BoardsService {
  constructor(@InjectModel('Board') private model: Model<Board>) {}

  create(dto: CreateBoardDto) { return this.model.create(dto); }
  findAll() { return this.model.find().lean(); }
  async findOne(id: string) {
    const doc = await this.model.findById(id).lean();
    if (!doc) throw new NotFoundException('Board not found');
    return doc;
  }
  remove(id: string) { return this.model.findByIdAndDelete(id); }
}
