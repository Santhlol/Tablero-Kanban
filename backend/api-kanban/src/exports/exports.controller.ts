import { Body, Controller, Get, Headers, HttpCode, HttpStatus, NotFoundException, Param, Post } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { RequestExportDto } from './dto/request-export.dto';
import { ReportStatusDto } from './dto/report-status.dto';

@Controller('export')
export class ExportsController {
  constructor(private readonly service: ExportsService) {}

  @Post('backlog')
  @HttpCode(HttpStatus.ACCEPTED)
  requestExport(@Body() dto: RequestExportDto) {
    return this.service.requestExport(dto);
  }

  @Get('backlog/:id')
  getStatus(@Param('id') id: string) {
    const status = this.service.getStatus(id);
    if (!status) throw new NotFoundException('Solicitud de exportación no encontrada');
    return status;
  }

  @Post('backlog/status')
  @HttpCode(HttpStatus.ACCEPTED)
  reportStatus(@Headers('x-export-token') token: string | undefined, @Body() dto: ReportStatusDto) {
    this.service.validateStatusToken(token);
    return this.service.handleStatus(dto);
  }
}
