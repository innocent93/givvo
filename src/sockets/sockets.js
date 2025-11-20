import { Server } from 'socket.io';
// import config from '../config.js';

export default function initSocket(server) {
  const io = new Server(server, { cors: { origin: process.env.SOCKET_ORIGIN } });
  global.io = io;
  io.on('connection', socket => {
    console.log('socket connected', socket.id);
    socket.on('join', room => socket.join(room));
    socket.on('leave', room => socket.leave(room));
    socket.on('disconnect', () => {});
  });
  return io;
}
