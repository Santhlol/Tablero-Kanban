import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RealtimeEvents } from './realtime.gateway.types';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws' })
export class KanbanGateway {
  @WebSocketServer() server: Server;

  emitToBoard(boardId: string, event: RealtimeEvents, payload: any) {
    this.server.to(boardId).emit(event, payload);
  }

  @SubscribeMessage('joinBoard')
  handleJoin(@MessageBody() data: { boardId: string }, @ConnectedSocket() socket: Socket) {
    socket.join(data.boardId);
    socket.emit('joined', { ok: true, boardId: data.boardId });
  }
}
