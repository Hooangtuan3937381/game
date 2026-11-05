/**
 * Tự động khởi chạy Máy Chủ Laptop (server-standalone.cjs) và mở đường truyền
 * Cloudflare Quick Tunnel tốc độ cao, tự động đăng ký với Render 24/7
 * (game-6ckg.onrender.com / game.hoangnhattuan.click).
 *
 * Đặc biệt: KHÔNG dùng 'npx' hay 'shell: true', chạy trực tiếp bằng process.execPath!
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const RENDER_URLS = [
  'https://game-6ckg.onrender.com/api/laptop-tunnel',
  'https://game.hoangnhattuan.click/api/laptop-tunnel',
];

const CLOUDFLARED_EXE = path.resolve('cloudflared.exe');
const CLOUDFLARED_DOWNLOAD_URL =
  'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';

async function downloadCloudflared(dest) {
  const res = await fetch(CLOUDFLARED_DOWNLOAD_URL, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  });
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status}`);
  }
  const fileStream = fs.createWriteStream(dest);
  await finished(Readable.fromWeb(res.body).pipe(fileStream));
}

async function sendHeartbeat(tunnelUrl) {
  for (const endpoint of RENDER_URLS) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tunnelUrl }),
      });
    } catch {
      // ignore network error
    }
  }
}

async function main() {
  console.log('================================================================');
  console.log('  DANG KHOI DONG MAY CHU LAPTOP + TU DONG LIEN KET RENDER 24/7');
  console.log('================================================================');

  // 1. Khởi chạy trực tiếp server-standalone.cjs bằng chính process.execPath (không cần npx!)
  const standalonePath = path.resolve('server-standalone.cjs');
  const tsxCliPath = path.resolve('node_modules/tsx/dist/cli.mjs');

  const serverArgs = fs.existsSync(standalonePath)
    ? [standalonePath]
    : [tsxCliPath, path.resolve('server.ts')];

  const serverProc = spawn(process.execPath, serverArgs, {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: '3000',
    },
  });

  // 2. Tự động tải cloudflared.exe nếu đang chạy trên Windows và chưa có file
  if (process.platform === 'win32' && !fs.existsSync(CLOUDFLARED_EXE)) {
    console.log(
      '[Tunnel] Dang tai cong cu Cloudflare Quick Tunnel (khoang 3-5 giay)...'
    );
    try {
      await downloadCloudflared(CLOUDFLARED_EXE);
      console.log('[Tunnel] Da tai xong cloudflared.exe!');
    } catch (err) {
      console.log(
        '[Tunnel] Khong the tai cloudflared.exe tu dong:',
        err.message
      );
    }
  }

  const canRunTunnel =
    process.platform !== 'win32' || fs.existsSync(CLOUDFLARED_EXE);
  const bin = process.platform === 'win32' ? CLOUDFLARED_EXE : 'cloudflared';

  let activeTunnelUrl = '';
  let heartbeatInterval = null;
  let tunnelProc = null;

  if (canRunTunnel) {
    try {
      tunnelProc = spawn(bin, ['tunnel', '--url', 'http://localhost:3000'], {
        shell: false,
      });

      const handleOutput = (chunk) => {
        const text = String(chunk);
        const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
        if (match && !activeTunnelUrl) {
          activeTunnelUrl = match[0];
          console.log(
            '\n================================================================'
          );
          console.log('  [THANH CONG] MAY CHU LAPTOP DA SAN SANG (PING ~10ms)!');
          console.log('  -> Choi ngay tren Laptop: http://localhost:3000');
          console.log('  -> Duong truyen Internet: ' + activeTunnelUrl);
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

      tunnelProc.stdout.on('data', handleOutput);
      tunnelProc.stderr.on('data', handleOutput);
      tunnelProc.on('error', () => {
        // ignore if cloudflared is not installed
      });
    } catch {
      // ignore
    }
  }

  const cleanup = async () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (activeTunnelUrl) {
      await sendHeartbeat('');
    }
    try {
      if (tunnelProc) tunnelProc.kill();
    } catch {}
    try {
      serverProc.kill();
    } catch {}
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main();
