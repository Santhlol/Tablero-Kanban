import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
export class TasksController {
  constructor(private service: TasksService) {}

  @Post() create(@Body() dto: CreateTaskDto) {
    return this.service.create(dto);
  }
  @Get('board/:boardId') byBoard(@Param('boardId') boardId: string) {
    return this.service.findByBoard(boardId);
  }
  @Get('column/:columnId') byColumn(@Param('columnId') columnId: string) {
    return this.service.findByColumn(columnId);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() data: UpdateTaskDto) {
    return this.service.update(id, data);
  }
  @Patch(':id/move') move(@Param('id') id: string, @Body() dto: MoveTaskDto) {
    return this.service.move(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
