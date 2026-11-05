/**
 * Tự động tạo đường truyền tốc độ cao từ Laptop và đăng ký với máy chủ dự phòng Render
 * (game-6ckg.onrender.com / game.hoangnhattuan.click) mà KHÔNG cần sửa thêm DNS trên iNET!
 */
import { spawn } from 'child_process';
import fs from 'fs';
import https from 'https';
import path from 'path';

const RENDER_URLS = [
  'https://game-6ckg.onrender.com/api/laptop-tunnel',
  'https://game.hoangnhattuan.click/api/laptop-tunnel',
];

const CLOUDFLARED_EXE = path.resolve('cloudflared.exe');
const CLOUDFLARED_DOWNLOAD_URL =
  'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          file.close();
          downloadFile(res.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
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

  // 1. Start game server on localhost:3000
  const serverProc = spawn('npx', ['tsx', 'server.ts'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'production', PORT: '3000' },
  });

  // 2. If on Windows, download cloudflared.exe automatically if missing
  if (process.platform === 'win32' && !fs.existsSync(CLOUDFLARED_EXE)) {
    console.log(
      '[Tunnel] Dang tai cong cu ket noi Cloudflare Quick Tunnel (1 lan duy nhat)...'
    );
    try {
      await downloadFile(CLOUDFLARED_DOWNLOAD_URL, CLOUDFLARED_EXE);
      console.log('[Tunnel] Da tai xong cloudflared.exe!');
    } catch (err) {
      console.log(
        '[Tunnel] Khong the tai cloudflared.exe tu dong:',
        err.message
      );
    }
  }

  const bin =
    process.platform === 'win32' && fs.existsSync(CLOUDFLARED_EXE)
      ? CLOUDFLARED_EXE
      : 'cloudflared';

  let activeTunnelUrl = '';
  let heartbeatInterval = null;

  try {
    const tunnelProc = spawn(
      bin,
      ['tunnel', '--url', 'http://localhost:3000'],
      {
        shell: true,
      }
    );

    const handleOutput = (chunk) => {
      const text = String(chunk);
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !activeTunnelUrl) {
        activeTunnelUrl = match[0];
        console.log('\n================================================================');
        console.log('  [THANH CONG] MAY CHU LAPTOP DA SAN SANG (PING ~10ms)!');
        console.log('  -> Duong truyen Laptop: ' + activeTunnelUrl);
        console.log(
          '  -> Da tu dong lien ket voi https://game.hoangnhattuan.click'
        );
        console.log(
          '  -> Khi ban tat cua so nay, game se tu dong chuyen ve Render 24/7!'
        );
        console.log('================================================================\n');

        sendHeartbeat(activeTunnelUrl);
        heartbeatInterval = setInterval(() => {
          sendHeartbeat(activeTunnelUrl);
        }, 15000);
      }
    };

    tunnelProc.stdout.on('data', handleOutput);
    tunnelProc.stderr.on('data', handleOutput);
    tunnelProc.on('error', () => {
      // cloudflared not installed on non-windows
    });
  } catch {
    // ignore
  }

  const cleanup = async () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (activeTunnelUrl) {
      await sendHeartbeat('');
    }
    serverProc.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main();
