import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

const app = express();
app.use(cors({ origin: process.env.APP_URL ?? 'http://localhost:3000' }));
app.get('/health', (_request, response) => response.json({ status: 'ok', service: 'socket' }));
const server = createServer(app);
const io = new Server(server, { cors: { origin: process.env.APP_URL ?? 'http://localhost:3000' } });

io.on('connection', (socket) => {
  socket.on('workspace:join', (workspaceId: string) => socket.join(`workspace:${workspaceId}`));
  socket.on('workspace:leave', (workspaceId: string) => socket.leave(`workspace:${workspaceId}`));
  socket.on('presence:update', (payload: { workspaceId: string; status: string }) => socket.to(`workspace:${payload.workspaceId}`).emit('presence:changed', payload));
});

const port = Number(process.env.SOCKET_PORT ?? 4001);
server.listen(port, () => console.log(`Devpulse Socket server listening on :${port}`));
