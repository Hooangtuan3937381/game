import {
  Direction,
  MirrorAngle,
  OwnerTag,
  PlayerRole,
  SentinelArchetype,
  TileType,
} from './levels';
import { PuzzleState } from './rules';

export interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface MapPingBeacon {
  x: number;
  y: number;
  role: PlayerRole;
  senderName: string;
  age: number;
  maxAge: number;
}

const MAX_PARTICLES = 128;

export class PixelSceneRenderer {
  public particles: PooledParticle[] = [];
  private particleCursor = 0;

  // Smooth visual interpolation for P1 and P2
  public visualPlayerX = 1;
  public visualPlayerY = 1;
  public playerScaleX = 1;
  public playerScaleY = 1;

  public visualPlayer2X = 1;
  public visualPlayer2Y = 2;
  public player2ScaleX = 1;
  public player2ScaleY = 1;

  public hitFlashTimer = 0;
  public hitstopTimer = 0;
  public cameraTrauma = 0;
  public pings: MapPingBeacon[] = [];

  private blockVisuals = new Map<string, { x: number; y: number; flash: number }>();
  private sentinelVisuals = new Map<string, { x: number; y: number }>();
  private motes: { x: number; y: number; speed: number; phase: number; color: string }[] = [];

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 3,
        color: '#fbbf24',
      });
    }

    for (let i = 0; i < 32; i++) {
      this.motes.push({
        x: (i * 73) % 1000,
        y: (i * 41) % 1000,
        speed: 12 + (i % 5) * 4,
        phase: i * 0.7,
        color: i % 3 === 0 ? '#38bdf8' : '#fbbf24',
      });
    }
  }

  public syncStateInstant(state: PuzzleState) {
    this.visualPlayerX = state.playerX;
    this.visualPlayerY = state.playerY;
    this.playerScaleX = 1;
    this.playerScaleY = 1;

    this.visualPlayer2X = state.player2X >= 0 ? state.player2X : state.playerX;
    this.visualPlayer2Y = state.player2Y >= 0 ? state.player2Y : state.playerY;
    this.player2ScaleX = 1;
    this.player2ScaleY = 1;

    this.blockVisuals.clear();
    for (const b of state.blocks) {
      this.blockVisuals.set(b.id, { x: b.x, y: b.y, flash: 0 });
    }
    this.sentinelVisuals.clear();
    for (const s of state.sentinels) {
      this.sentinelVisuals.set(s.id, { x: s.x, y: s.y });
    }
  }

  public triggerSquash(sx: number, sy: number, role: PlayerRole = 'P1') {
    if (role === 'P1') {
      this.playerScaleX = sx;
      this.playerScaleY = sy;
    } else {
      this.player2ScaleX = sx;
      this.player2ScaleY = sy;
    }
  }

  public triggerShake(trauma: number, hitstop = 0.045) {
    this.cameraTrauma = Math.min(1, this.cameraTrauma + trauma);
    this.hitstopTimer = Math.max(this.hitstopTimer, hitstop);
  }

  public addPing(x: number, y: number, role: PlayerRole, senderName: string) {
    this.pings.push({
      x,
      y,
      role,
      senderName,
      age: 0,
      maxAge: 2.6,
    });
    this.spawnBurst(
      x,
      y,
      14,
      role === 'P1' ? '#10b981' : '#38bdf8',
      1.15
    );
  }

  public spawnBurst(
    gridX: number,
    gridY: number,
    count: number,
    color: string,
    speedScale = 1
  ) {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.5 - 0.25);
      const speed = (1.4 + Math.random() * 2.6) * speedScale;
      p.active = true;
      p.x = gridX + 0.5;
      p.y = gridY + 0.5;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0;
      p.maxLife = 0.28 + Math.random() * 0.25;
      p.size = i % 2 === 0 ? 4 : 3;
      p.color = color;
    }
  }

  public update(dt: number, state: PuzzleState) {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
    }
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    }
    if (this.cameraTrauma > 0) {
      this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 2.4);
    }

    const simDt = this.hitstopTimer > 0 ? dt * 0.15 : dt;
    const lerpRate = Math.min(1, simDt * 18);

    this.visualPlayerX += (state.playerX - this.visualPlayerX) * lerpRate;
    this.visualPlayerY += (state.playerY - this.visualPlayerY) * lerpRate;
    this.playerScaleX += (1 - this.playerScaleX) * Math.min(1, simDt * 14);
    this.playerScaleY += (1 - this.playerScaleY) * Math.min(1, simDt * 14);

    if (state.isCoop && state.player2X >= 0) {
      this.visualPlayer2X += (state.player2X - this.visualPlayer2X) * lerpRate;
      this.visualPlayer2Y += (state.player2Y - this.visualPlayer2Y) * lerpRate;
      this.player2ScaleX += (1 - this.player2ScaleX) * Math.min(1, simDt * 14);
      this.player2ScaleY += (1 - this.player2ScaleY) * Math.min(1, simDt * 14);
    }

    for (const b of state.blocks) {
      let vis = this.blockVisuals.get(b.id);
      if (!vis) {
        vis = { x: b.x, y: b.y, flash: 0 };
        this.blockVisuals.set(b.id, vis);
      } else {
        vis.x += (b.x - vis.x) * lerpRate;
        vis.y += (b.y - vis.y) * lerpRate;
        if (vis.flash > 0) vis.flash = Math.max(0, vis.flash - dt);
      }
    }

    for (const s of state.sentinels) {
      let vis = this.sentinelVisuals.get(s.id);
      if (!vis) {
        vis = { x: s.x, y: s.y };
        this.sentinelVisuals.set(s.id, vis);
      } else {
        vis.x += (s.x - vis.x) * lerpRate;
        vis.y += (s.y - vis.y) * lerpRate;
      }
    }

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    }

    // Update map pings
    for (let i = this.pings.length - 1; i >= 0; i--) {
      this.pings[i].age += dt;
      if (this.pings[i].age >= this.pings[i].maxAge) {
        this.pings.splice(i, 1);
      }
    }
  }

  public getBoardMetrics(
    canvasWidth: number,
    canvasHeight: number,
    state: PuzzleState,
    isTitleMode: boolean
  ) {
    const safeTop = isTitleMode ? 40 : 76;
    const safeBottom = isTitleMode ? 40 : 92;
    const availW = canvasWidth - 48;
    const availH = canvasHeight - safeTop - safeBottom;

    const rawTile = Math.floor(
      Math.min(availW / state.width, availH / state.height)
    );
    const tileSize = Math.max(36, Math.min(80, Math.floor(rawTile / 4) * 4));
    const boardW = tileSize * state.width;
    const boardH = tileSize * state.height;

    const offsetX = isTitleMode
      ? Math.floor(canvasWidth * 0.58 - boardW * 0.45)
      : Math.floor((canvasWidth - boardW) / 2);
    const offsetY = Math.floor(safeTop + (availH - boardH) / 2);

    return { tileSize, boardW, boardH, offsetX, offsetY };
  }

  public render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    state: PuzzleState,
    timeSec: number,
    isTitleMode: boolean,
    hintTargetTile: { x: number; y: number } | null,
    activeControlRole: PlayerRole = 'P1'
  ) {
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = '#121722';
    ctx.lineWidth = 2;
    const bgGrid = 48;
    for (let gx = 0; gx < canvasWidth; gx += bgGrid) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, canvasHeight);
      ctx.stroke();
    }
    for (let gy = 0; gy < canvasHeight; gy += bgGrid) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(canvasWidth, gy);
      ctx.stroke();
    }

    const { tileSize, boardW, boardH, offsetX, offsetY } = this.getBoardMetrics(
      canvasWidth,
      canvasHeight,
      state,
      isTitleMode
    );

    const shakeMag = this.cameraTrauma * this.cameraTrauma * 10;
    const shakeX =
      shakeMag > 0.1 ? Math.round((Math.random() * 2 - 1) * shakeMag) : 0;
    const shakeY =
      shakeMag > 0.1 ? Math.round((Math.random() * 2 - 1) * shakeMag) : 0;

    const titlePanX = isTitleMode ? Math.round(Math.sin(timeSec * 0.7) * 8) : 0;
    const titlePanY = isTitleMode ? Math.round(Math.cos(timeSec * 0.5) * 6) : 0;

    const ox = offsetX + shakeX + titlePanX;
    const oy = offsetY + shakeY + titlePanY;

    ctx.save();

    ctx.fillStyle = '#06080c';
    ctx.fillRect(ox - 8, oy + 8, boardW + 16, boardH + 16);

    ctx.fillStyle = '#1e2636';
    ctx.fillRect(ox - 6, oy - 6, boardW + 12, boardH + 12);
    ctx.fillStyle = '#334155';
    ctx.fillRect(ox - 4, oy - 4, boardW + 8, boardH + 8);

    // 2. Render Tiles
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const tile = state.tiles[y][x];
        const px = ox + x * tileSize;
        const py = oy + y * tileSize;
        this.drawPixelTile(ctx, tile, x, y, px, py, tileSize, state, timeSec);
      }
    }

    // 3. Render Sentinel Windup Telegraphs
    for (const s of state.sentinels) {
      if (!s.alive || !s.windupTargetTiles.length) continue;
      const pulse = 0.45 + 0.35 * Math.sin(timeSec * 12);
      for (const wt of s.windupTargetTiles) {
        const tx = ox + wt.x * tileSize;
        const ty = oy + wt.y * tileSize;
        ctx.fillStyle = s.windupActive
          ? `rgba(239, 68, 68, ${pulse.toFixed(2)})`
          : 'rgba(245, 158, 11, 0.18)';
        ctx.fillRect(tx + 4, ty + 4, tileSize - 8, tileSize - 8);

        ctx.strokeStyle = s.windupActive ? '#ef4444' : '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(tx + 5, ty + 5, tileSize - 10, tileSize - 10);
      }
    }

    // 4. Render Hint Highlight
    if (hintTargetTile) {
      const hx = ox + hintTargetTile.x * tileSize;
      const hy = oy + hintTargetTile.y * tileSize;
      const hPulse = 0.5 + 0.4 * Math.sin(timeSec * 8);
      ctx.strokeStyle = `rgba(56, 189, 248, ${hPulse.toFixed(2)})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(hx + 4, hy + 4, tileSize - 8, tileSize - 8);
    }

    // 5. Render Emitters & Crystals
    for (const em of state.emitters) {
      const ex = ox + em.x * tileSize;
      const ey = oy + em.y * tileSize;
      this.drawEmitter(ctx, ex, ey, tileSize, em.dir, timeSec);
    }

    for (const cr of state.crystals) {
      const cx = ox + cr.x * tileSize;
      const cy = oy + cr.y * tileSize;
      this.drawCrystal(ctx, cx, cy, tileSize, cr.powered, timeSec);
    }

    // 6. Render Blocks (Rune Blocks & Prism Mirrors with Owner Color Coding)
    for (const b of state.blocks) {
      const vis = this.blockVisuals.get(b.id) || { x: b.x, y: b.y, flash: 0 };
      const bx = Math.round(ox + vis.x * tileSize);
      const by = Math.round(oy + vis.y * tileSize);
      const onPlate = state.tiles[b.y]?.[b.x] === 'PLATE';

      if (b.kind === 'RUNE') {
        this.drawRuneBlock(
          ctx,
          bx,
          by,
          tileSize,
          onPlate,
          b.owner || 'NONE',
          timeSec
        );
      } else {
        this.drawMirrorBlock(
          ctx,
          bx,
          by,
          tileSize,
          b.mirrorAngle || 'SLASH',
          b.owner || 'NONE',
          timeSec
        );
      }
    }

    // 7. Render Active Laser Beams
    for (const seg of state.laserSegments) {
      const sx1 = ox + (seg.x1 + 0.5) * tileSize;
      const sy1 = oy + (seg.y1 + 0.5) * tileSize;
      const sx2 = ox + (seg.x2 + 0.5) * tileSize;
      const sy2 = oy + (seg.y2 + 0.5) * tileSize;

      ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
      ctx.lineWidth = Math.max(6, Math.floor(tileSize * 0.16));
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();

      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = Math.max(2, Math.floor(tileSize * 0.06));
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
    }

    // 8. Render Sentinels
    for (const s of state.sentinels) {
      if (!s.alive) continue;
      const vis = this.sentinelVisuals.get(s.id) || { x: s.x, y: s.y };
      const sx = Math.round(ox + vis.x * tileSize);
      const sy = Math.round(oy + vis.y * tileSize);
      this.drawSentinel(
        ctx,
        sx,
        sy,
        tileSize,
        s.archetype,
        s.dir,
        s.windupActive,
        timeSec
      );
    }

    // 9. Render Players (P1 Emerald Archivist + P2 Azure Archivist in Co-op)
    const p1x = Math.round(ox + this.visualPlayerX * tileSize);
    const p1y = Math.round(oy + this.visualPlayerY * tileSize);
    this.drawPlayer(
      ctx,
      p1x,
      p1y,
      tileSize,
      state.playerDir,
      this.playerScaleX,
      this.playerScaleY,
      this.hitFlashTimer > 0,
      timeSec,
      'P1',
      state.isCoop && activeControlRole === 'P1'
    );

    if (state.isCoop && state.player2X >= 0) {
      const p2x = Math.round(ox + this.visualPlayer2X * tileSize);
      const p2y = Math.round(oy + this.visualPlayer2Y * tileSize);
      this.drawPlayer(
        ctx,
        p2x,
        p2y,
        tileSize,
        state.player2Dir,
        this.player2ScaleX,
        this.player2ScaleY,
        this.hitFlashTimer > 0,
        timeSec + 0.4,
        'P2',
        activeControlRole === 'P2'
      );
    }

    // 10. Render Co-op Map Pings
    for (const ping of this.pings) {
      const progress = ping.age / ping.maxAge;
      const alpha = Math.max(0, 1 - progress);
      const ppx = ox + ping.x * tileSize;
      const ppy = oy + ping.y * tileSize;
      const color = ping.role === 'P1' ? '#10b981' : '#38bdf8';

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      const inset = Math.floor(Math.sin(ping.age * 10) * 3) + 4;
      ctx.strokeRect(
        ppx + inset,
        ppy + inset,
        tileSize - inset * 2,
        tileSize - inset * 2
      );

      ctx.fillStyle = '#090b10';
      ctx.fillRect(ppx + 4, ppy - 16, tileSize - 8, 14);
      ctx.fillStyle = color;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        ping.role,
        ppx + tileSize / 2,
        ppy - 6
      );
      ctx.restore();
    }

    // 11. Render Pooled Particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      const ppx = Math.round(ox + p.x * tileSize);
      const ppy = Math.round(oy + p.y * tileSize);
      const sz = Math.max(2, Math.round((p.size * tileSize) / 48));
      ctx.fillRect(ppx - sz, ppy - sz, sz * 2, sz * 2);
    }
    ctx.globalAlpha = 1;

    // 12. Ambient floating pixel dust motes
    for (const m of this.motes) {
      const mx = Math.round((m.x + timeSec * m.speed) % canvasWidth);
      const my = Math.round(
        (m.y + Math.sin(timeSec * 1.2 + m.phase) * 24 + canvasHeight) %
          canvasHeight
      );
      ctx.fillStyle = m.color;
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(timeSec * 2 + m.phase);
      ctx.fillRect(mx, my, 3, 3);
    }
    ctx.globalAlpha = 1;

    if (isTitleMode) {
      const grad = ctx.createLinearGradient(0, 0, canvasWidth * 0.52, 0);
      grad.addColorStop(0, 'rgba(11, 14, 20, 0.94)');
      grad.addColorStop(0.75, 'rgba(11, 14, 20, 0.78)');
      grad.addColorStop(1, 'rgba(11, 14, 20, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasWidth * 0.55, canvasHeight);
    }

    ctx.restore();
  }

  private drawPixelTile(
    ctx: CanvasRenderingContext2D,
    tile: TileType,
    gx: number,
    gy: number,
    px: number,
    py: number,
    s: number,
    state: PuzzleState,
    timeSec: number
  ) {
    const u = Math.max(2, Math.floor(s / 16));

    if (tile === 'WALL') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = '#334155';
      ctx.fillRect(px, py, s, u * 2);
      ctx.fillRect(px, py, u * 2, s);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px, py + Math.floor(s * 0.5), s, u);
      ctx.fillRect(px + Math.floor(s * 0.5), py, u, Math.floor(s * 0.5));
      ctx.fillRect(
        px + Math.floor(s * 0.25),
        py + Math.floor(s * 0.5),
        u,
        Math.floor(s * 0.5)
      );
      ctx.fillRect(px, py + s - u * 2, s, u * 2);

      if (gy === 0 && gx % 3 === 1) {
        const flicker = Math.sin(timeSec * 14 + gx) > 0 ? u : 0;
        ctx.fillStyle = '#78350f';
        ctx.fillRect(px + u * 7, py + u * 8, u * 2, u * 5);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(px + u * 6, py + u * 5 - flicker, u * 4, u * 4);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(px + u * 7, py + u * 6 - flicker, u * 2, u * 2);
      }
      return;
    }

    const isAlt = (gx + gy) % 2 === 0;
    ctx.fillStyle = isAlt ? '#151c28' : '#18202e';
    ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#10151f';
    ctx.fillRect(px, py, s, u);
    ctx.fillRect(px, py, u, s);

    if (tile === 'ICE') {
      ctx.fillStyle = '#0e3a5c';
      ctx.fillRect(px + u, py + u, s - u * 2, s - u * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(px + u * 3, py + u * 3, u * 4, u);
      ctx.fillRect(px + u * 8, py + u * 10, u * 5, u);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(px + u * 4, py + u * 4, u * 2, u);
    } else if (tile === 'BARRIER_P1' || tile === 'BARRIER_P2') {
      const isP1 = tile === 'BARRIER_P1';
      ctx.fillStyle = isP1 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(56, 189, 248, 0.18)';
      ctx.fillRect(px + u, py + u, s - u * 2, s - u * 2);
      ctx.fillStyle = isP1 ? '#10b981' : '#38bdf8';
      // Energy laser posts on top/bottom or left/right
      ctx.fillRect(px + u * 2, py + u * 2, u * 3, u * 3);
      ctx.fillRect(px + s - u * 5, py + u * 2, u * 3, u * 3);
      ctx.fillRect(px + u * 2, py + s - u * 5, u * 3, u * 3);
      ctx.fillRect(px + s - u * 5, py + s - u * 5, u * 3, u * 3);
      // Dashed energy barrier lines
      ctx.fillStyle = isP1 ? '#6ee7b7' : '#bae6fd';
      ctx.fillRect(px + u * 6, py + u * 7, u * 4, u * 2);
    } else if (tile === 'PLATE') {
      ctx.fillStyle = '#292524';
      ctx.fillRect(px + u * 2, py + u * 2, s - u * 4, s - u * 4);
      const pulse = Math.sin(timeSec * 5) > 0 ? '#fbbf24' : '#d97706';
      ctx.fillStyle = pulse;
      ctx.fillRect(px + u * 4, py + u * 4, s - u * 8, s - u * 8);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(px + u * 6, py + u * 6, s - u * 12, s - u * 12);
    } else if (tile === 'TELEPORTER') {
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(px + u * 2, py + u * 2, s - u * 4, s - u * 4);
      ctx.fillStyle = '#818cf8';
      ctx.fillRect(px + u * 4, py + u * 4, s - u * 8, s - u * 8);
      ctx.fillStyle = '#e0e7ff';
      ctx.fillRect(px + u * 6, py + u * 6, u * 4, u * 4);
    } else if (tile === 'SPIKE_OFF' || tile === 'SPIKE_ON') {
      const active = tile === 'SPIKE_ON';
      const points = [
        [u * 4, u * 4],
        [u * 10, u * 4],
        [u * 4, u * 10],
        [u * 10, u * 10],
      ];
      for (const [oxp, oyp] of points) {
        ctx.fillStyle = '#090b10';
        ctx.fillRect(px + oxp, py + oyp, u * 3, u * 3);
        if (active) {
          ctx.fillStyle = '#e11d48';
          ctx.fillRect(px + oxp + u * 0.5, py + oyp - u, u * 2, u * 3);
          ctx.fillStyle = '#fda4af';
          ctx.fillRect(px + oxp + u, py + oyp - u, u, u);
        }
      }
    } else if (tile === 'EXIT' || tile === 'EXIT_P1' || tile === 'EXIT_P2') {
      const open = state.portalOpen;
      const isP2Exit = tile === 'EXIT_P2';
      const outerColor = open
        ? isP2Exit
          ? '#0c4a6e'
          : '#064e3b'
        : '#1f2937';
      const ringColor = open
        ? isP2Exit
          ? '#0284c7'
          : '#10b981'
        : isP2Exit
          ? '#0369a1'
          : '#047857';

      ctx.fillStyle = outerColor;
      ctx.fillRect(px + u * 2, py + u * 2, s - u * 4, s - u * 4);
      ctx.fillStyle = ringColor;
      ctx.fillRect(px + u * 3, py + u * 3, s - u * 6, s - u * 6);
      if (open) {
        const spin = Math.floor(timeSec * 8) % 2 === 0;
        ctx.fillStyle = isP2Exit
          ? spin
            ? '#7dd3fc'
            : '#38bdf8'
          : spin
            ? '#6ee7b7'
            : '#34d399';
        ctx.fillRect(px + u * 5, py + u * 5, s - u * 10, s - u * 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + u * 7, py + u * 7, u * 2, u * 2);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px + u * 5, py + u * 5, s - u * 10, s - u * 10);
      }

      if (tile === 'EXIT_P1' || tile === 'EXIT_P2') {
        ctx.fillStyle = tile === 'EXIT_P1' ? '#6ee7b7' : '#bae6fd';
        ctx.font = `bold ${Math.max(9, u * 3)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(
          tile === 'EXIT_P1' ? 'P1' : 'P2',
          px + s / 2,
          py + s - u * 1.5
        );
      }
    }
  }

  private drawRuneBlock(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    s: number,
    onPlate: boolean,
    owner: OwnerTag,
    timeSec: number
  ) {
    const u = Math.max(2, Math.floor(s / 16));
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(px + u * 2, py + s - u, s - u * 4, u * 2);

    const outerFill =
      owner === 'P1'
        ? '#065f46'
        : owner === 'P2'
          ? '#075985'
          : onPlate
            ? '#78350f'
            : '#334155';
    const bevelFill =
      owner === 'P1'
        ? '#10b981'
        : owner === 'P2'
          ? '#38bdf8'
          : onPlate
            ? '#d97706'
            : '#64748b';
    const crossFill =
      owner === 'P1'
        ? '#6ee7b7'
        : owner === 'P2'
          ? '#bae6fd'
          : onPlate
            ? Math.sin(timeSec * 8) > 0
              ? '#fef08a'
              : '#fbbf24'
            : '#f59e0b';

    ctx.fillStyle = outerFill;
    ctx.fillRect(px + u * 2, py + u * 2, s - u * 4, s - u * 4);

    ctx.fillStyle = bevelFill;
    ctx.fillRect(px + u * 2, py + u * 2, s - u * 4, u * 2);
    ctx.fillRect(px + u * 2, py + u * 2, u * 2, s - u * 4);

    ctx.fillStyle = onPlate ? '#fbbf24' : '#0f172a';
    ctx.fillRect(px + u * 4, py + u * 4, s - u * 8, s - u * 8);

    ctx.fillStyle = crossFill;
    ctx.fillRect(px + u * 7, py + u * 5, u * 2, u * 6);
    ctx.fillRect(px + u * 5, py + u * 7, u * 6, u * 2);
  }

  private drawMirrorBlock(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    s: number,
    angle: MirrorAngle,
    owner: OwnerTag,
    _timeSec: number
  ) {
    const u = Math.max(2, Math.floor(s / 16));
    ctx.fillStyle =
      owner === 'P1' ? '#064e3b' : owner === 'P2' ? '#0c4a6e' : '#1e293b';
    ctx.fillRect(px + u * 2, py + u * 2, s - u * 4, s - u * 4);

    // Owner border frame
    ctx.strokeStyle =
      owner === 'P1' ? '#10b981' : owner === 'P2' ? '#38bdf8' : '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + u * 2, py + u * 2, s - u * 4, s - u * 4);

    ctx.strokeStyle =
      owner === 'P1' ? '#6ee7b7' : owner === 'P2' ? '#bae6fd' : '#fde68a';
    ctx.lineWidth = Math.max(3, u * 1.5);

    ctx.beginPath();
    if (angle === 'SLASH') {
      ctx.moveTo(px + u * 3, py + s - u * 3);
      ctx.lineTo(px + s - u * 3, py + u * 3);
    } else {
      ctx.moveTo(px + u * 3, py + u * 3);
      ctx.lineTo(px + s - u * 3, py + s - u * 3);
    }
    ctx.stroke();
  }

  private drawEmitter(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    s: number,
    _dir: Direction,
    timeSec: number
  ) {
    const u = Math.max(2, Math.floor(s / 16));
    ctx.fillStyle = '#4c0519';
    ctx.fillRect(px + u * 3, py + u * 3, s - u * 6, s - u * 6);
    ctx.fillStyle = Math.sin(timeSec * 10) > 0 ? '#f43f5e' : '#e11d48';
    ctx.fillRect(px + u * 5, py + u * 5, s - u * 10, s - u * 10);
  }

  private drawCrystal(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    s: number,
    powered: boolean,
    timeSec: number
  ) {
    const u = Math.max(2, Math.floor(s / 16));
    ctx.fillStyle = powered ? '#be123c' : '#334155';
    ctx.fillRect(px + u * 3, py + u * 3, s - u * 6, s - u * 6);
    ctx.fillStyle = powered
      ? Math.sin(timeSec * 10) > 0
        ? '#fda4af'
        : '#fb7185'
      : '#64748b';
    ctx.fillRect(px + u * 5, py + u * 5, s - u * 10, s - u * 10);
  }

  private drawSentinel(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    s: number,
    archetype: SentinelArchetype,
    dir: Direction,
    windup: boolean,
    timeSec: number
  ) {
    const u = Math.max(2, Math.floor(s / 16));
    const bob = Math.sin(timeSec * 6) > 0 ? u : 0;

    if (archetype === 'PATROL_GOLEM') {
      ctx.fillStyle = windup ? '#991b1b' : '#3f3f46';
      ctx.fillRect(px + u * 3, py + u * 3 - bob, s - u * 6, s - u * 5);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(px + u * 6, py + u * 6 - bob, u * 4, u * 2);
    } else if (archetype === 'GAZE_TURRET') {
      ctx.fillStyle = '#451a03';
      ctx.fillRect(px + u * 3, py + u * 3, s - u * 6, s - u * 6);
      ctx.fillStyle = windup ? '#ef4444' : '#f59e0b';
      ctx.fillRect(px + u * 5, py + u * 5, s - u * 10, s - u * 10);
      const dx = dir === 'LEFT' ? -u : dir === 'RIGHT' ? u : 0;
      const dy = dir === 'UP' ? -u : dir === 'DOWN' ? u : 0;
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(px + u * 7 + dx, py + u * 7 + dy, u * 2, u * 2);
    } else {
      ctx.fillStyle = windup ? '#be123c' : '#581c87';
      ctx.fillRect(px + u * 3, py + u * 3 - bob, s - u * 6, s - u * 5);
      ctx.fillStyle = '#e879f9';
      ctx.fillRect(px + u * 5, py + u * 6 - bob, u * 2, u * 2);
      ctx.fillRect(px + u * 9, py + u * 6 - bob, u * 2, u * 2);
    }
  }

  private drawPlayer(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    s: number,
    dir: Direction,
    scaleX: number,
    scaleY: number,
    hitFlash: boolean,
    timeSec: number,
    role: PlayerRole,
    isActiveFocus: boolean
  ) {
    const u = Math.max(2, Math.floor(s / 16));
    const bob = Math.sin(timeSec * 7) > 0 ? u : 0;
    const isP2 = role === 'P2';

    ctx.save();
    ctx.translate(px + s / 2, py + s - u * 2);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-(px + s / 2), -(py + s - u * 2));

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(px + u * 4, py + s - u * 3, s - u * 8, u * 2);

    // Cloak & Tunic (P1 = Emerald #059669, P2 = Azure #0284c7)
    ctx.fillStyle = hitFlash ? '#ffffff' : isP2 ? '#0284c7' : '#059669';
    ctx.fillRect(px + u * 4, py + u * 6 - bob, u * 8, u * 7);

    // Shoulder Trim
    ctx.fillStyle = hitFlash ? '#ffffff' : isP2 ? '#bae6fd' : '#fbbf24';
    ctx.fillRect(px + u * 3, py + u * 6 - bob, u * 10, u * 2);

    // Hood
    ctx.fillStyle = hitFlash ? '#ffffff' : isP2 ? '#38bdf8' : '#10b981';
    ctx.fillRect(px + u * 4, py + u * 2 - bob, u * 8, u * 5);

    // Face & Glowing Eyes
    const eyeOffset = dir === 'LEFT' ? -u : dir === 'RIGHT' ? u : 0;
    ctx.fillStyle = isP2 ? '#082f49' : '#064e3b';
    ctx.fillRect(px + u * 5 + eyeOffset, py + u * 4 - bob, u * 6, u * 3);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(px + u * 6 + eyeOffset, py + u * 5 - bob, u * 1.5, u * 1.5);
    ctx.fillRect(px + u * 9 + eyeOffset, py + u * 5 - bob, u * 1.5, u * 1.5);

    // Active Role Indicator Triangle above hood in Co-op
    if (isActiveFocus) {
      ctx.fillStyle = isP2 ? '#38bdf8' : '#10b981';
      ctx.fillRect(px + u * 7, py - u - bob, u * 2, u * 2);
    }

    ctx.restore();
  }
}
