    import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';

@Controller('columns')
export class ColumnsController {
  constructor(private service: ColumnsService) {}

  @Post() create(@Body() dto: CreateColumnDto) { return this.service.create(dto); }
  @Get('board/:boardId') byBoard(@Param('boardId') boardId: string) { return this.service.findByBoard(boardId); }
  @Patch(':id') update(@Param('id') id: string, @Body() data: Partial<CreateColumnDto>) { return this.service.update(id, data as any); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
