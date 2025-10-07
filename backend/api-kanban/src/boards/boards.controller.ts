import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { ColumnsService } from '../columns/columns.service';
import { TasksService } from '../tasks/tasks.service';

@Controller('boards')
export class BoardsController {
  constructor(
    private boards: BoardsService,
    private columns: ColumnsService,
    private tasks: TasksService,
  ) {}

  @Post() create(@Body() dto: CreateBoardDto) {
    return this.boards.create(dto);
  }
  @Get() findAll() {
    return this.boards.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.boards.findOne(id);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.boards.remove(id);
  }

  @Get(':id/summary')
  async summary(@Param('id') id: string) {
    const [cols, tasks] = await Promise.all([
      this.columns.findByBoard(id),
      this.tasks.findByBoard(id),
    ]);
    const map: Record<string, number> = {};
    tasks.forEach((t) => {
      map[String(t.columnId)] = (map[String(t.columnId)] || 0) + 1;
    });
    return {
      boardId: id,
      totalTasks: tasks.length,
      columns: cols.map((c) => ({
        id: c._id,
        title: c.title,
        count: map[String(c._id)] || 0,
      })),
    };
  }
}
