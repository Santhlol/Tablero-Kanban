import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { randomUUID } from 'crypto';
import { BoardsService } from '../boards/boards.service';
import { KanbanGateway } from '../realtime/realtime.gateway';
import { RealtimeEvents } from '../realtime/realtime.gateway.types';
import { RequestExportDto, ExportField, EXPORTABLE_FIELDS } from './dto/request-export.dto';
import { ExportFinalStatus, ReportStatusDto } from './dto/report-status.dto';

export type ExportStatus = 'pending' | 'success' | 'error';

export type ExportPayload = {
  requestId: string;
  boardId: string;
  to: string;
  fields: ExportField[];
  status: ExportStatus;
  requestedAt: string;
  completedAt?: string | null;
  error?: string | null;
};

type ExportRequestState = {
  requestId: string;
  boardId: string;
  to: string;
  fields: ExportField[];
  status: ExportStatus;
  requestedAt: Date;
  completedAt?: Date;
  error?: string;
};

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);
  private readonly requests = new Map<string, ExportRequestState>();

  constructor(
    private readonly boards: BoardsService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly realtime: KanbanGateway,
  ) {}

  private getWebhookUrl() {
    return this.config.get<string>('N8N_EXPORT_WEBHOOK_URL');
  }

  private getWebhookToken() {
    return this.config.get<string>('N8N_EXPORT_WEBHOOK_TOKEN');
  }

  private getCallbackUrl() {
    return this.config.get<string>('EXPORT_CALLBACK_URL');
  }

  private getStatusToken() {
    return this.config.get<string>('EXPORT_STATUS_TOKEN');
  }

  private serialize(state: ExportRequestState): ExportPayload {
    return {
      requestId: state.requestId,
      boardId: state.boardId,
      to: state.to,
      fields: state.fields,
      status: state.status,
      requestedAt: state.requestedAt.toISOString(),
      completedAt: state.completedAt ? state.completedAt.toISOString() : null,
      error: state.error ?? null,
    };
  }

  private markAs(state: ExportRequestState, status: ExportStatus, error?: string) {
    state.status = status;
    state.error = error;
    state.completedAt = status === 'pending' ? undefined : new Date();
    this.requests.set(state.requestId, state);
    const event =
      status === 'pending'
        ? RealtimeEvents.ExportRequested
        : status === 'success'
        ? RealtimeEvents.ExportCompleted
        : RealtimeEvents.ExportFailed;
    this.realtime.emitToBoard(state.boardId, event, this.serialize(state));
  }

  async requestExport(dto: RequestExportDto) {
    const board = await this.boards.findOne(dto.boardId);
    const fields = dto.fields?.length ? dto.fields : [...EXPORTABLE_FIELDS];
    const recipient = dto.email ?? dto.to;
    if (!recipient) {
      const message = 'Debes proporcionar un correo de destino.';
      this.logger.warn(`Export request without recipient for board ${dto.boardId}`);
      throw new BadRequestException(message);
    }
    const request: ExportRequestState = {
      requestId: randomUUID(),
      boardId: dto.boardId,
      to: recipient,
      fields,
      status: 'pending',
      requestedAt: new Date(),
    };

    this.requests.set(request.requestId, request);

    const webhookUrl = this.getWebhookUrl();
    if (!webhookUrl) {
      const message = 'N8N_EXPORT_WEBHOOK_URL no está configurada.';
      this.logger.error(message);
      this.markAs(request, 'error', message);
      throw new InternalServerErrorException('No se pudo iniciar la exportación del backlog.');
    }

    const payload = {
      requestId: request.requestId,
      board: { id: board._id, name: board.name, owner: board.owner },
      boardId: dto.boardId,
      email: recipient,
      to: recipient,
      fields,
      callbackUrl: this.getCallbackUrl(),
      requestedAt: request.requestedAt.toISOString(),
    };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = this.getWebhookToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await firstValueFrom(this.http.post(webhookUrl, payload, { headers }));
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Error desconocido al contactar el webhook de n8n.';
      this.logger.error(`Fallo al disparar exportación ${request.requestId}: ${reason}`);
      this.markAs(
        request,
        'error',
        'No se pudo contactar con el webhook de exportación. Verifica la configuración de n8n.',
      );
      throw new InternalServerErrorException('No se pudo iniciar la exportación del backlog.');
    }

    this.markAs(request, 'pending');
    return this.serialize(request);
  }

  getStatus(requestId: string) {
    const state = this.requests.get(requestId);
    if (!state) return null;
    return this.serialize(state);
  }

  validateStatusToken(token?: string) {
    const expected = this.getStatusToken();
    if (!expected) return true; // If no token configured, accept all (for dev convenience)
    if (!token || token !== expected) {
      throw new UnauthorizedException('Token de exportación inválido');
    }
    return true;
  }

  handleStatus(dto: ReportStatusDto) {
    const existing = this.requests.get(dto.requestId);
    const state: ExportRequestState = existing ?? {
      requestId: dto.requestId,
      boardId: dto.boardId,
      to: dto.email ?? dto.to ?? '',
      fields: dto.fields?.length ? dto.fields : [...EXPORTABLE_FIELDS],
      status: 'pending',
      requestedAt: new Date(),
    };

    if (!existing) {
      this.requests.set(state.requestId, state);
    }

    const recipient = dto.email ?? dto.to;
    if (recipient) {
      state.to = recipient;
    }
    if (dto.fields?.length) {
      state.fields = dto.fields;
    }

    if (dto.status === ExportFinalStatus.Success) {
      this.markAs(state, 'success');
    } else {
      this.markAs(state, 'error', dto.error || 'La exportación falló.');
    }

    return this.serialize(state);
  }
}
