import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    socket.auth = { token };
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
