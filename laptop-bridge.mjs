/**
 * MÁY CHỦ LAPTOP ĐỘC LẬP 100% (ZERO-DEPENDENCY NODE.JS SERVER + CLOUDFLARE TUNNEL)
 * - Không cần cài npm, npx hay node_modules!
 * - Tự động xóa file cloudflared.exe bị lỗi (0KB) và tải lại bản chuẩn cho Windows.
 * - Tự động liên kết với https://game.hoangnhattuan.click (Render 24/7).
 */
import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const PORT = Number(process.env.PORT) || 3000;
const RENDER_ORIGIN = 'https://game-6ckg.onrender.com';
const RENDER_TUNNEL_ENDPOINTS = [
  'https://game-6ckg.onrender.com/api/laptop-tunnel',
  'https://game.hoangnhattuan.click/api/laptop-tunnel',
];

const CLOUDFLARED_EXE = path.resolve('cloudflared.exe');
const CLOUDFLARED_URL =
  process.arch === 'ia32'
    ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-386.exe'
    : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';

// ============================================================================
// 1. BỘ XỬ LÝ WEBSOCKET THUẦN NODE.JS (RFC 6455 - KHÔNG CẦN THƯ VIỆN NGOÀI)
// ============================================================================
function encodeWsFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + Text frame
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function createWsConnection(socket) {
  let buffer = Buffer.alloc(0);
  const listeners = { message: [], close: [] };

  const conn = {
    isOpen: true,
    send(obj) {
      if (!conn.isOpen || socket.destroyed) return;
      try {
        socket.write(encodeWsFrame(JSON.stringify(obj)));
      } catch {}
    },
    on(event, fn) {
      if (listeners[event]) listeners[event].push(fn);
    },
  };

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 2) {
      const firstByte = buffer[0];
      const opcode = firstByte & 0x0f;
      const secondByte = buffer[1];
      const isMasked = Boolean(secondByte & 0x80);
      let payloadLen = secondByte & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (buffer.length < 4) return;
        payloadLen = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buffer.length < 10) return;
        payloadLen = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      const maskLen = isMasked ? 4 : 0;
      if (buffer.length < offset + maskLen + payloadLen) return;

      const mask = isMasked ? buffer.subarray(offset, offset + 4) : null;
      offset += maskLen;
      const data = Buffer.from(buffer.subarray(offset, offset + payloadLen));
      buffer = buffer.subarray(offset + payloadLen);

      if (opcode === 0x08) {
        // Close frame
        conn.isOpen = false;
        socket.end();
        return;
      }
      if (opcode === 0x09) {
        // Ping -> Pong
        const pong = Buffer.from([0x8a, 0x00]);
        socket.write(pong);
        continue;
      }
      if (opcode === 0x01) {
        if (mask) {
          for (let i = 0; i < data.length; i++) {
            data[i] ^= mask[i & 3];
          }
        }
        const text = data.toString('utf8');
        for (const fn of listeners.message) fn(text);
      }
    }
  });

  const handleClose = () => {
    if (!conn.isOpen) return;
    conn.isOpen = false;
    for (const fn of listeners.close) fn();
  };

  socket.on('close', handleClose);
  socket.on('end', handleClose);
  socket.on('error', handleClose);

  return conn;
}

// ============================================================================
// 2. QUẢN LÝ PHÒNG CHƠI CO-OP THỜI GIAN THỰC TRÊN LAPTOP
// ============================================================================
const rooms = new Map();
const clientRoomMap = new Map();
const allClients = new Map();
let nextClientSeq = 1;

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function assignRoomRole(existingMembers, joiningPlayerId, preferredRole = 'AUTO') {
  const existing = existingMembers.find((m) => m.playerId === joiningPlayerId);
  if (existing) return existing.role;
  const others = existingMembers.filter((m) => m.playerId !== joiningPlayerId);
  const p1Taken = others.some((m) => m.role === 'P1');
  const p2Taken = others.some((m) => m.role === 'P2');
  if (p1Taken && !p2Taken) return 'P2';
  if (p2Taken && !p1Taken) return 'P1';
  return preferredRole === 'P2' ? 'P2' : 'P1';
}

function serializeRoom(room) {
  return {
    roomId: room.roomId,
    roomName: room.roomName,
    isPublic: room.isPublic,
    levelId: room.levelId,
    levelTitle:
      room.puzzleState?.level?.title || `Màn Co-op #${room.levelId || 11}`,
    playerCount: room.members.length,
    maxPlayers: 2,
    players: room.members.map((m) => ({
      playerId: m.playerId,
      name: m.name,
      role: m.role,
    })),
  };
}

function getPublicRooms() {
  const list = [];
  for (const r of rooms.values()) {
    if (r.isPublic && r.members.length > 0) list.push(serializeRoom(r));
  }
  return list;
}

function broadcastLobby() {
  const msg = { type: 'lobby:list', rooms: getPublicRooms() };
  for (const c of allClients.values()) c.send(msg);
}

function broadcastRoom(room, payload) {
  for (const m of room.members) m.conn.send(payload);
}

function broadcastRoomState(room) {
  const summary = serializeRoom(room);
  for (const m of room.members) {
    m.conn.send({
      type: 'room:state',
      assignedRole: m.role,
      room: summary,
      puzzleState: room.puzzleState,
    });
  }
}

function removeClient(clientId) {
  const code = clientRoomMap.get(clientId);
  if (!code) return;
  clientRoomMap.delete(clientId);
  const room = rooms.get(code);
  if (!room) return;
  room.members = room.members.filter((m) => m.clientId !== clientId);
  if (room.members.length === 0) {
    rooms.delete(code);
  } else {
    broadcastRoomState(room);
  }
  broadcastLobby();
}

// ============================================================================
// 3. KHỞI CHẠY HTTP + WEBSOCKET SERVER TRÊN PORT 3000
// ============================================================================
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function startStandaloneLaptopServer() {
  const distDir = path.resolve('dist');

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${PORT}`);

    if (url.pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({ ok: true, mode: 'LAPTOP_PRIMARY', ts: Date.now() })
      );
      return;
    }

    if (url.pathname === '/api/rooms') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ rooms: getPublicRooms() }));
      return;
    }

    // Phục vụ file tĩnh nếu đã có thư mục dist, hoặc chuyển tiếp thông minh từ Render
    const safePath =
      url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    const localFile = path.join(distDir, safePath);

    if (fs.existsSync(localFile) && fs.statSync(localFile).isFile()) {
      const ext = path.extname(localFile).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      });
      fs.createReadStream(localFile).pipe(res);
      return;
    }

    try {
      const upstream = await fetch(`${RENDER_ORIGIN}${url.pathname}${url.search}`);
      res.writeHead(upstream.status, {
        'Content-Type':
          upstream.headers.get('content-type') || 'text/html; charset=utf-8',
      });
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
    } catch {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        '<h2>May Chu WebSocket Laptop dang hoat dong! Hay mo https://game.hoangnhattuan.click de choi.</h2>'
      );
    }
  });

  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }
    const accept = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );

    const conn = createWsConnection(socket);
    const clientId = `laptop-${Date.now()}-${nextClientSeq++}`;
    allClients.set(clientId, conn);

    conn.send({ type: 'lobby:list', rooms: getPublicRooms() });

    conn.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (!msg || typeof msg.type !== 'string') return;

        if (msg.type === 'lobby:subscribe') {
          conn.send({ type: 'lobby:list', rooms: getPublicRooms() });
          return;
        }

        if (msg.type === 'room:create') {
          removeClient(clientId);
          const roomId = generateRoomCode();
          const playerId = String(msg.playerId || clientId).trim() || clientId;
          const initialRole = msg.preferredRole === 'P2' ? 'P2' : 'P1';
          const room = {
            roomId,
            roomName: String(msg.roomName || 'Tháp Đá Hợp Lực').slice(0, 32),
            isPublic: Boolean(msg.isPublic),
            levelId: Number(msg.levelId) || 11,
            members: [
              {
                clientId,
                playerId,
                name: String(msg.playerName || 'Pháp Sư Lục Bảo').slice(0, 24),
                role: initialRole,
                conn,
              },
            ],
            puzzleState: msg.puzzleState || null,
          };
          rooms.set(roomId, room);
          clientRoomMap.set(clientId, roomId);
          conn.send({
            type: 'room:joined',
            clientId,
            playerId,
            assignedRole: initialRole,
            room: serializeRoom(room),
            puzzleState: room.puzzleState,
          });
          broadcastLobby();
          return;
        }

        if (msg.type === 'room:join') {
          const code = String(msg.roomId || '')
            .trim()
            .toUpperCase();
          if (!code) return;
          removeClient(clientId);
          let room = rooms.get(code);
          const playerId = String(msg.playerId || clientId).trim() || clientId;
          if (!room) {
            room = {
              roomId: code,
              roomName: `Phòng #${code}`,
              isPublic: true,
              levelId: Number(msg.levelId) || 11,
              members: [],
              puzzleState: msg.puzzleState || null,
            };
            rooms.set(code, room);
          }
          if (!room.puzzleState && msg.puzzleState) {
            room.puzzleState = msg.puzzleState;
          }
          const assignedRole = assignRoomRole(
            room.members,
            playerId,
            msg.preferredRole || 'AUTO'
          );
          room.members = room.members.filter(
            (m) => m.playerId !== playerId && m.role !== assignedRole
          );
          room.members.push({
            clientId,
            playerId,
            name: String(msg.playerName || 'Pháp Sư Lam Tinh').slice(0, 24),
            role: assignedRole,
            conn,
          });
          clientRoomMap.set(clientId, code);
          conn.send({
            type: 'room:joined',
            clientId,
            playerId,
            assignedRole,
            room: serializeRoom(room),
            puzzleState: room.puzzleState,
          });
          broadcastRoomState(room);
          broadcastLobby();
          return;
        }

        if (msg.type === 'room:leave') {
          removeClient(clientId);
          conn.send({ type: 'room:left' });
          return;
        }

        const code = clientRoomMap.get(clientId);
        if (!code) return;
        const room = rooms.get(code);
        if (!room) return;
        const member = room.members.find((m) => m.clientId === clientId);
        if (!member) return;

        if (msg.type === 'room:swap_role') {
          if (room.members.length === 1) {
            member.role = member.role === 'P1' ? 'P2' : 'P1';
          } else if (room.members.length >= 2) {
            for (const m of room.members) {
              m.role = m.role === 'P1' ? 'P2' : 'P1';
            }
          }
          broadcastRoomState(room);
          broadcastLobby();
          return;
        }

        if (msg.type === 'game:move' || msg.type === 'game:rotate') {
          // Khi có đủ 2 người chơi trong phòng, chặn mọi thao tác điều khiển nhầm sang nhân vật của người kia
          if (
            room.members.length >= 2 &&
            msg.role &&
            msg.role !== member.role
          ) {
            broadcastRoomState(room);
            return;
          }
          if (msg.puzzleState) room.puzzleState = msg.puzzleState;
          broadcastRoomState(room);
          return;
        }

        if (
          msg.type === 'room:select_level' ||
          msg.type === 'game:undo' ||
          msg.type === 'game:restart'
        ) {
          if (msg.levelId) room.levelId = Number(msg.levelId);
          if (msg.puzzleState) room.puzzleState = msg.puzzleState;
          broadcastRoomState(room);
          broadcastLobby();
          return;
        }

        if (msg.type === 'game:ping') {
          broadcastRoom(room, {
            type: 'game:ping',
            x: Number(msg.x),
            y: Number(msg.y),
            role: room.members.length >= 2 ? member.role : msg.role || member.role,
            senderName: member.name,
          });
        }
      } catch {}
    });

    conn.on('close', () => {
      allClients.delete(clientId);
      removeClient(clientId);
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[OK] May Chu Laptop dang chay tai: http://localhost:${PORT}`);
  });

  return server;
}

// ============================================================================
// 4. TỰ ĐỘNG TẢI CLOUDFLARED CHUẨN & ĐĂNG KÝ VỚI RENDER 24/7
// ============================================================================
async function ensureValidCloudflared() {
  if (process.platform !== 'win32') return false;

  // Nếu file cloudflared.exe cũ bị lỗi (< 10MB), tự động xóa đi để tránh lỗi Windows!
  if (fs.existsSync(CLOUDFLARED_EXE)) {
    try {
      const stat = fs.statSync(CLOUDFLARED_EXE);
      if (stat.size < 10_000_000) {
        console.log(
          '[Tunnel] Phat hien file cloudflared.exe cu bi loi (dung luong 0KB), dang xoa va tai lai...'
        );
        fs.unlinkSync(CLOUDFLARED_EXE);
      } else {
        return true;
      }
    } catch {
      return false;
    }
  }

  console.log(
    '[Tunnel] Dang tai cong cu ket noi Cloudflare (~35MB, vui long doi 5-10 giay)...'
  );
  const tempPath = CLOUDFLARED_EXE + '.download';
  try {
    const res = await fetch(CLOUDFLARED_URL, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}`);
    }
    const out = fs.createWriteStream(tempPath);
    await finished(Readable.fromWeb(res.body).pipe(out));
    const finalSize = fs.statSync(tempPath).size;
    if (finalSize < 10_000_000) {
      fs.unlinkSync(tempPath);
      throw new Error('File tai ve chua du dung luong');
    }
    fs.renameSync(tempPath, CLOUDFLARED_EXE);
    console.log('[Tunnel] Da tai xong cloudflared.exe thanh cong!');
    return true;
  } catch (err) {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {}
    console.log('[Tunnel] Khong the tai cloudflared.exe:', err.message);
    return false;
  }
}

async function sendHeartbeat(tunnelUrl) {
  for (const endpoint of RENDER_TUNNEL_ENDPOINTS) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tunnelUrl }),
      });
    } catch {}
  }
}

async function main() {
  console.log('================================================================');
  console.log('  MAY CHU LAPTOP DOC LAP 100% + TU DONG DU PHONG RENDER 24/7');
  console.log('================================================================');

  startStandaloneLaptopServer();

  const hasCloudflared = await ensureValidCloudflared();
  if (!hasCloudflared) {
    console.log(
      '[Thong bao] Ban co the choi ngay tren Laptop tai: http://localhost:3000'
    );
    return;
  }

  let activeTunnelUrl = '';
  let heartbeatInterval = null;

  try {
    const tunnelProc = spawn(
      CLOUDFLARED_EXE,
      ['tunnel', '--url', `http://localhost:${PORT}`],
      { shell: false }
    );

    const onOutput = (chunk) => {
      const text = String(chunk);
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !activeTunnelUrl) {
        activeTunnelUrl = match[0];
        console.log(
          '\n================================================================'
        );
        console.log('  [THANH CONG] MAY CHU LAPTOP DA KET NOI INTERNET (PING ~10ms)!');
        console.log('  -> Duong truyen Laptop: ' + activeTunnelUrl);
        console.log(
          '  -> Da tu dong lien ket voi https://game.hoangnhattuan.click'
        );
        console.log(
          '  -> Khi ban tat cua so nay, game se tu dong chuyen ve Render 24/7!'
        );
        console.log(
          '================================================================\n'
        );

        sendHeartbeat(activeTunnelUrl);
        heartbeatInterval = setInterval(() => {
          sendHeartbeat(activeTunnelUrl);
        }, 15000);
      }
    };

    tunnelProc.stdout.on('data', onOutput);
    tunnelProc.stderr.on('data', onOutput);
    tunnelProc.on('error', (err) => {
      console.log('[Tunnel] Loi khoi chay cloudflared:', err.message);
    });
  } catch (err) {
    console.log('[Tunnel] Bo qua ket noi ngoai:', err.message);
  }

  const cleanup = async () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (activeTunnelUrl) await sendHeartbeat('');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main();
