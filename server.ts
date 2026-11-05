import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { Direction, PlayerRole } from './src/game/levels';
import {
  createLevelState,
  PuzzleState,
  rotateAdjacentMirror,
  stepPlayerMove,
  undoLastMove,
} from './src/game/rules';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RoomMember {
  clientId: string;
  name: string;
  role: PlayerRole;
  ws: WebSocket;
}

export interface RoomSession {
  roomId: string;
  roomName: string;
  isPublic: boolean;
  levelId: number;
  createdAt: number;
  members: RoomMember[];
  puzzleState: PuzzleState;
}

export interface PublicRoomSummary {
  roomId: string;
  roomName: string;
  isPublic: boolean;
  levelId: number;
  levelTitle: string;
  playerCount: number;
  maxPlayers: number;
  players: { name: string; role: PlayerRole }[];
}

const rooms = new Map<string, RoomSession>();
const clientRoomMap = new Map<string, string>();
const allClients = new Map<string, WebSocket>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function serializeRoomSummary(room: RoomSession): PublicRoomSummary {
  return {
    roomId: room.roomId,
    roomName: room.roomName,
    isPublic: room.isPublic,
    levelId: room.levelId,
    levelTitle: room.puzzleState.level.title,
    playerCount: room.members.length,
    maxPlayers: 2,
    players: room.members.map((m) => ({ name: m.name, role: m.role })),
  };
}

function getPublicRoomList(): PublicRoomSummary[] {
  const list: PublicRoomSummary[] = [];
  for (const room of rooms.values()) {
    if (room.isPublic && room.members.length > 0) {
      list.push(serializeRoomSummary(room));
    }
  }
  return list.sort((a, b) => b.playerCount - a.playerCount);
}

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastLobbyList() {
  const payload = {
    type: 'lobby:list',
    rooms: getPublicRoomList(),
  };
  for (const ws of allClients.values()) {
    sendJson(ws, payload);
  }
}

function broadcastToRoom(room: RoomSession, payload: unknown) {
  for (const member of room.members) {
    sendJson(member.ws, payload);
  }
}

function broadcastRoomState(room: RoomSession) {
  broadcastToRoom(room, {
    type: 'room:state',
    room: serializeRoomSummary(room),
    puzzleState: room.puzzleState,
  });
}

function removeClientFromCurrentRoom(clientId: string) {
  const roomId = clientRoomMap.get(clientId);
  if (!roomId) return;
  clientRoomMap.delete(clientId);

  const room = rooms.get(roomId);
  if (!room) return;

  room.members = room.members.filter((m) => m.clientId !== clientId);
  if (room.members.length === 0) {
    rooms.delete(roomId);
  } else {
    broadcastRoomState(room);
  }
  broadcastLobbyList();
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      mode: process.env.RENDER === 'true' ? 'RENDER_BACKUP' : 'LAPTOP_PRIMARY',
      ts: Date.now(),
    });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: getPublicRoomList() });
  });

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', `http://${request.headers.host}`);
    if (url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  let nextClientSeq = 1;

  wss.on('connection', (ws: WebSocket) => {
    const clientId = `client-${Date.now()}-${nextClientSeq++}`;
    allClients.set(clientId, ws);

    // Send initial lobby list immediately on connect
    sendJson(ws, {
      type: 'lobby:list',
      rooms: getPublicRoomList(),
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (!msg || typeof msg.type !== 'string') return;

        if (msg.type === 'lobby:subscribe') {
          sendJson(ws, {
            type: 'lobby:list',
            rooms: getPublicRoomList(),
          });
          return;
        }

        if (msg.type === 'room:create') {
          removeClientFromCurrentRoom(clientId);
          const levelId = Number(msg.levelId) || 11;
          const roomId = generateRoomCode();
          const playerName =
            String(msg.playerName || 'Pháp Sư Lục Bảo').trim().slice(0, 24) ||
            'Pháp Sư Lục Bảo';
          const roomName =
            String(msg.roomName || `Phòng của ${playerName}`)
              .trim()
              .slice(0, 32) || `Phòng #${roomId}`;
          const isPublic = msg.isPublic !== false;

          const room: RoomSession = {
            roomId,
            roomName,
            isPublic,
            levelId,
            createdAt: Date.now(),
            members: [
              {
                clientId,
                name: playerName,
                role: 'P1',
                ws,
              },
            ],
            puzzleState: createLevelState(levelId),
          };

          rooms.set(roomId, room);
          clientRoomMap.set(clientId, roomId);

          sendJson(ws, {
            type: 'room:joined',
            clientId,
            assignedRole: 'P1',
            room: serializeRoomSummary(room),
            puzzleState: room.puzzleState,
          });
          broadcastLobbyList();
          return;
        }

        if (msg.type === 'room:join') {
          const code = String(msg.roomId || '')
            .trim()
            .toUpperCase();
          if (!code) return;

          removeClientFromCurrentRoom(clientId);
          let room = rooms.get(code);
          const playerName =
            String(msg.playerName || 'Pháp Sư Lam Tinh').trim().slice(0, 24) ||
            'Pháp Sư Lam Tinh';

          // If room doesn't exist yet (e.g. joining via shared URL link), create it automatically
          if (!room) {
            const levelId = Number(msg.levelId) || 11;
            room = {
              roomId: code,
              roomName: `Phòng #${code}`,
              isPublic: true,
              levelId,
              createdAt: Date.now(),
              members: [],
              puzzleState: createLevelState(levelId),
            };
            rooms.set(code, room);
          }

          const hasP1 = room.members.some((m) => m.role === 'P1');
          const assignedRole: PlayerRole = hasP1 ? 'P2' : 'P1';

          room.members.push({
            clientId,
            name: playerName,
            role: assignedRole,
            ws,
          });
          clientRoomMap.set(clientId, code);

          sendJson(ws, {
            type: 'room:joined',
            clientId,
            assignedRole,
            room: serializeRoomSummary(room),
            puzzleState: room.puzzleState,
          });

          broadcastRoomState(room);
          broadcastLobbyList();
          return;
        }

        if (msg.type === 'room:leave') {
          removeClientFromCurrentRoom(clientId);
          sendJson(ws, { type: 'room:left' });
          return;
        }

        // In-room actions
        const activeRoomId = clientRoomMap.get(clientId);
        if (!activeRoomId) return;
        const room = rooms.get(activeRoomId);
        if (!room) return;
        const member = room.members.find((m) => m.clientId === clientId);
        if (!member) return;

        // If only 1 player is connected in the room, allow them to control the role specified in msg.role (via [Tab] switch)
        const effectiveRole: PlayerRole =
          room.members.length === 1 && (msg.role === 'P1' || msg.role === 'P2')
            ? msg.role
            : member.role;

        if (msg.type === 'room:select_level') {
          const nextLevelId = Number(msg.levelId) || 11;
          room.levelId = nextLevelId;
          room.puzzleState = createLevelState(nextLevelId);
          broadcastRoomState(room);
          broadcastLobbyList();
          return;
        }

        if (msg.type === 'game:move') {
          const dir = msg.dir as Direction;
          if (!['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(dir)) return;
          stepPlayerMove(room.puzzleState, dir, effectiveRole);
          broadcastRoomState(room);
          return;
        }

        if (msg.type === 'game:rotate') {
          rotateAdjacentMirror(room.puzzleState, effectiveRole);
          broadcastRoomState(room);
          return;
        }

        if (msg.type === 'game:undo') {
          if (undoLastMove(room.puzzleState)) {
            broadcastRoomState(room);
          }
          return;
        }

        if (msg.type === 'game:restart') {
          room.puzzleState = createLevelState(room.levelId);
          broadcastRoomState(room);
          return;
        }

        if (msg.type === 'game:ping') {
          const gx = Number(msg.x);
          const gy = Number(msg.y);
          if (Number.isFinite(gx) && Number.isFinite(gy)) {
            broadcastToRoom(room, {
              type: 'game:ping',
              x: gx,
              y: gy,
              role: effectiveRole,
              senderName: member.name,
            });
          }
          return;
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      allClients.delete(clientId);
      removeClientFromCurrentRoom(clientId);
    });
  });

  const isProd =
    process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
