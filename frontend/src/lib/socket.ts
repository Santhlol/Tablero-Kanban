import { io } from 'socket.io-client';

export const socket = io(
  import.meta.env.VITE_API_WS || 'http://localhost:3000/ws',
  { autoConnect: true }
);
