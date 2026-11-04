import {
  BlockEntity,
  CrystalEntity,
  Direction,
  EmitterEntity,
  LEVELS,
  LevelDefinition,
  MirrorAngle,
  OwnerTag,
  PlayerRole,
  SentinelEntity,
  TileType,
} from './levels';

export interface LaserSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dir: Direction;
}

export interface SnapshotState {
  playerX: number;
  playerY: number;
  playerDir: Direction;
  player2X: number;
  player2Y: number;
  player2Dir: Direction;
  hp: number;
  moves: number;
  tiles: TileType[][];
  blocks: BlockEntity[];
  crystals: CrystalEntity[];
  sentinels: SentinelEntity[];
}

export interface PuzzleState {
  levelId: number;
  level: LevelDefinition;
  isCoop: boolean;
  width: number;
  height: number;
  tiles: TileType[][];
  playerX: number;
  playerY: number;
  playerDir: Direction;
  player2X: number;
  player2Y: number;
  player2Dir: Direction;
  hp: number;
  maxHp: number;
  moves: number;
  blocks: BlockEntity[];
  emitters: EmitterEntity[];
  crystals: CrystalEntity[];
  sentinels: SentinelEntity[];
  laserSegments: LaserSegment[];
  portalOpen: boolean;
  p1OnExit: boolean;
  p2OnExit: boolean;
  activatedPlates: number;
  totalPlates: number;
  poweredCrystals: number;
  totalCrystals: number;
  status: 'PLAYING' | 'VICTORY' | 'DEFEAT';
  history: SnapshotState[];
  lastEvents: GameFeedbackEvent[];
}

export type GameFeedbackEvent =
  | { type: 'MOVE'; role: PlayerRole; x: number; y: number }
  | { type: 'PUSH_BLOCK'; role: PlayerRole; x: number; y: number; slid: boolean }
  | { type: 'ROTATE_MIRROR'; role: PlayerRole; x: number; y: number; angle: MirrorAngle }
  | { type: 'TELEPORT'; fromX: number; fromY: number; toX: number; toY: number }
  | { type: 'PLATE_ACTIVATED'; x: number; y: number }
  | { type: 'CRYSTAL_POWERED'; x: number; y: number }
  | { type: 'SENTINEL_DESTROYED'; x: number; y: number }
  | { type: 'SENTINEL_WINDUP'; x: number; y: number }
  | { type: 'PLAYER_HURT'; x: number; y: number; reason: string }
  | { type: 'PORTAL_OPENED' }
  | { type: 'STAGE_CLEAR' }
  | { type: 'BUMP_WALL'; role: PlayerRole; x: number; y: number };

export function dirDelta(dir: Direction): { dx: number; dy: number } {
  switch (dir) {
    case 'UP':
      return { dx: 0, dy: -1 };
    case 'DOWN':
      return { dx: 0, dy: 1 };
    case 'LEFT':
      return { dx: -1, dy: 0 };
    case 'RIGHT':
      return { dx: 1, dy: 0 };
  }
}

export function oppositeDir(dir: Direction): Direction {
  switch (dir) {
    case 'UP':
      return 'DOWN';
    case 'DOWN':
      return 'UP';
    case 'LEFT':
      return 'RIGHT';
    case 'RIGHT':
      return 'LEFT';
  }
}

export function rotateClockwise(dir: Direction): Direction {
  switch (dir) {
    case 'UP':
      return 'RIGHT';
    case 'RIGHT':
      return 'DOWN';
    case 'DOWN':
      return 'LEFT';
    case 'LEFT':
      return 'UP';
  }
}

export function reflectLaser(inDir: Direction, angle: MirrorAngle): Direction {
  if (angle === 'SLASH') {
    switch (inDir) {
      case 'UP':
        return 'RIGHT';
      case 'RIGHT':
        return 'UP';
      case 'DOWN':
        return 'LEFT';
      case 'LEFT':
        return 'DOWN';
    }
  } else {
    switch (inDir) {
      case 'UP':
        return 'LEFT';
      case 'LEFT':
        return 'UP';
      case 'DOWN':
        return 'RIGHT';
      case 'RIGHT':
        return 'DOWN';
    }
  }
}

export function canRoleInteractWithOwner(
  role: PlayerRole,
  owner?: OwnerTag
): boolean {
  if (!owner || owner === 'NONE') return true;
  return owner === role;
}

export function isTileBlockedForRole(
  state: PuzzleState,
  x: number,
  y: number,
  role: PlayerRole
): boolean {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return true;
  const tile = state.tiles[y][x];
  if (tile === 'WALL') return true;
  if (tile === 'BARRIER_P1' && role !== 'P1') return true;
  if (tile === 'BARRIER_P2' && role !== 'P2') return true;
  return false;
}

export function isTileBlockedForBlock(
  state: PuzzleState,
  x: number,
  y: number,
  owner?: OwnerTag
): boolean {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return true;
  const tile = state.tiles[y][x];
  if (tile === 'WALL') return true;
  if (tile === 'BARRIER_P1' && owner === 'P2') return true;
  if (tile === 'BARRIER_P2' && owner === 'P1') return true;
  return false;
}

function cloneSnapshot(state: PuzzleState): SnapshotState {
  return {
    playerX: state.playerX,
    playerY: state.playerY,
    playerDir: state.playerDir,
    player2X: state.player2X,
    player2Y: state.player2Y,
    player2Dir: state.player2Dir,
    hp: state.hp,
    moves: state.moves,
    tiles: state.tiles.map((row) => [...row]),
    blocks: state.blocks.map((b) => ({ ...b })),
    crystals: state.crystals.map((c) => ({ ...c })),
    sentinels: state.sentinels.map((s) => ({
      ...s,
      windupTargetTiles: s.windupTargetTiles.map((t) => ({ ...t })),
    })),
  };
}

export function createLevelState(levelId: number): PuzzleState {
  const level = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
  const height = level.grid.length;
  const width = level.grid[0].length;
  const tiles: TileType[][] = [];

  let playerX = 1;
  let playerY = 1;
  let player2X = -1;
  let player2Y = -1;
  let totalPlates = 0;
  let hasSecondSpawn = false;

  for (let y = 0; y < height; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < width; x++) {
      const ch = level.grid[y][x] || '#';
      switch (ch) {
        case '#':
          row.push('WALL');
          break;
        case 'P':
          playerX = x;
          playerY = y;
          row.push('FLOOR');
          break;
        case 'Q':
          player2X = x;
          player2Y = y;
          hasSecondSpawn = true;
          row.push('FLOOR');
          break;
        case 'O':
          totalPlates++;
          row.push('PLATE');
          break;
        case 'I':
          row.push('ICE');
          break;
        case 'E':
          row.push('EXIT');
          break;
        case 'A':
          row.push('EXIT_P1');
          break;
        case 'B':
          row.push('EXIT_P2');
          break;
        case '1':
          row.push('BARRIER_P1');
          break;
        case '2':
          row.push('BARRIER_P2');
          break;
        case '^':
          row.push('SPIKE_OFF');
          break;
        case '!':
          row.push('SPIKE_ON');
          break;
        case 'T':
          row.push('TELEPORTER');
          break;
        default:
          row.push('FLOOR');
          break;
      }
    }
    tiles.push(row);
  }

  const isCoop = Boolean(level.isCoop || hasSecondSpawn);

  const blocks: BlockEntity[] = level.blocks.map((b, i) => ({
    ...b,
    owner: b.owner || 'NONE',
    id: `block-${i}`,
  }));

  const emitters: EmitterEntity[] = level.emitters.map((e, i) => ({
    ...e,
    id: `emitter-${i}`,
  }));

  const crystals: CrystalEntity[] = level.crystals.map((c, i) => ({
    ...c,
    id: `crystal-${i}`,
    powered: false,
  }));

  const sentinels: SentinelEntity[] = level.sentinels.map((s, i) => ({
    ...s,
    id: `sentinel-${i}`,
    alive: true,
    stepCounter: 0,
    windupActive: false,
    windupTargetTiles: [],
  }));

  const state: PuzzleState = {
    levelId: level.id,
    level,
    isCoop,
    width,
    height,
    tiles,
    playerX,
    playerY,
    playerDir: 'RIGHT',
    player2X,
    player2Y,
    player2Dir: 'RIGHT',
    hp: 3,
    maxHp: 3,
    moves: 0,
    blocks,
    emitters,
    crystals,
    sentinels,
    laserSegments: [],
    portalOpen: false,
    p1OnExit: false,
    p2OnExit: false,
    activatedPlates: 0,
    totalPlates,
    poweredCrystals: 0,
    totalCrystals: crystals.length,
    status: 'PLAYING',
    history: [],
    lastEvents: [],
  };

  recalculateBoardEnvironment(state, false);
  return state;
}

export function isWallOrOutOfBounds(
  state: PuzzleState,
  x: number,
  y: number
): boolean {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return true;
  return state.tiles[y][x] === 'WALL';
}

export function getBlockAt(
  state: PuzzleState,
  x: number,
  y: number
): BlockEntity | undefined {
  return state.blocks.find((b) => b.x === x && b.y === y);
}

export function getCrystalAt(
  state: PuzzleState,
  x: number,
  y: number
): CrystalEntity | undefined {
  return state.crystals.find((c) => c.x === x && c.y === y);
}

export function getSentinelAt(
  state: PuzzleState,
  x: number,
  y: number
): SentinelEntity | undefined {
  return state.sentinels.find((s) => s.alive && s.x === x && s.y === y);
}

export function findTwinTeleporter(
  state: PuzzleState,
  x: number,
  y: number
): { x: number; y: number } | null {
  for (let ty = 0; ty < state.height; ty++) {
    for (let tx = 0; tx < state.width; tx++) {
      if (state.tiles[ty][tx] === 'TELEPORTER' && (tx !== x || ty !== y)) {
        return { x: tx, y: ty };
      }
    }
  }
  return null;
}

export function recalculateBoardEnvironment(
  state: PuzzleState,
  emitEvents = true
): void {
  const prevPortalOpen = state.portalOpen;
  const prevPoweredIds = new Set(
    state.crystals.filter((c) => c.powered).map((c) => c.id)
  );

  for (const c of state.crystals) {
    c.powered = false;
  }

  const segments: LaserSegment[] = [];

  for (const emitter of state.emitters) {
    let cx = emitter.x;
    let cy = emitter.y;
    let dir = emitter.dir;
    let steps = 0;
    const maxSteps = 64;

    while (steps < maxSteps) {
      steps++;
      const { dx, dy } = dirDelta(dir);
      const nx = cx + dx;
      const ny = cy + dy;

      if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height) {
        break;
      }

      const crystal = getCrystalAt(state, nx, ny);
      if (crystal) {
        segments.push({ x1: cx, y1: cy, x2: nx, y2: ny, dir });
        crystal.powered = true;
        if (emitEvents && !prevPoweredIds.has(crystal.id)) {
          state.lastEvents.push({ type: 'CRYSTAL_POWERED', x: nx, y: ny });
        }
        break;
      }

      if (state.tiles[ny][nx] === 'WALL') {
        break;
      }

      segments.push({ x1: cx, y1: cy, x2: nx, y2: ny, dir });

      const sentinel = getSentinelAt(state, nx, ny);
      if (sentinel) {
        sentinel.alive = false;
        sentinel.windupActive = false;
        sentinel.windupTargetTiles = [];
        if (emitEvents) {
          state.lastEvents.push({ type: 'SENTINEL_DESTROYED', x: nx, y: ny });
        }
        break;
      }

      const block = getBlockAt(state, nx, ny);
      if (block) {
        if (block.kind === 'RUNE') {
          break;
        } else if (block.kind === 'MIRROR') {
          dir = reflectLaser(dir, block.mirrorAngle || 'SLASH');
          cx = nx;
          cy = ny;
          continue;
        }
      }

      cx = nx;
      cy = ny;
    }
  }

  state.laserSegments = segments;

  // Count activated pressure plates
  let platesActive = 0;
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (state.tiles[y][x] === 'PLATE') {
        const hasBlock = Boolean(getBlockAt(state, x, y));
        const hasP1 = state.playerX === x && state.playerY === y;
        const hasP2 =
          state.isCoop && state.player2X === x && state.player2Y === y;
        if (hasBlock || hasP1 || hasP2) {
          platesActive++;
        }
      }
    }
  }

  state.activatedPlates = platesActive;
  state.poweredCrystals = state.crystals.filter((c) => c.powered).length;

  const allPlatesReady = state.activatedPlates >= state.totalPlates;
  const allCrystalsReady = state.poweredCrystals >= state.totalCrystals;
  state.portalOpen = allPlatesReady && allCrystalsReady;

  if (emitEvents && !prevPortalOpen && state.portalOpen) {
    state.lastEvents.push({ type: 'PORTAL_OPENED' });
  }

  const p1Tile = state.tiles[state.playerY]?.[state.playerX];
  state.p1OnExit = p1Tile === 'EXIT' || p1Tile === 'EXIT_P1';

  if (state.isCoop && state.player2X >= 0 && state.player2Y >= 0) {
    const p2Tile = state.tiles[state.player2Y]?.[state.player2X];
    state.p2OnExit = p2Tile === 'EXIT' || p2Tile === 'EXIT_P2';
  } else {
    state.p2OnExit = true;
  }

  if (
    state.status === 'PLAYING' &&
    state.portalOpen &&
    state.p1OnExit &&
    state.p2OnExit
  ) {
    state.status = 'VICTORY';
    if (emitEvents) {
      state.lastEvents.push({ type: 'STAGE_CLEAR' });
    }
  }
}

function stepSentinelsAndHazards(state: PuzzleState): void {
  if (state.moves > 0 && state.moves % 2 === 0) {
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (state.tiles[y][x] === 'SPIKE_OFF') {
          state.tiles[y][x] = 'SPIKE_ON';
        } else if (state.tiles[y][x] === 'SPIKE_ON') {
          state.tiles[y][x] = 'SPIKE_OFF';
        }
      }
    }
  }

  for (const s of state.sentinels) {
    if (!s.alive) continue;
    if (state.tiles[s.y][s.x] === 'SPIKE_ON') {
      s.alive = false;
      s.windupActive = false;
      s.windupTargetTiles = [];
      state.lastEvents.push({ type: 'SENTINEL_DESTROYED', x: s.x, y: s.y });
    }
  }

  const isPlayerAt = (x: number, y: number) =>
    (state.playerX === x && state.playerY === y) ||
    (state.isCoop && state.player2X === x && state.player2Y === y);

  for (const s of state.sentinels) {
    if (!s.alive) continue;
    s.stepCounter++;

    if (s.archetype === 'PATROL_GOLEM') {
      const { dx, dy } = dirDelta(s.dir);
      const nx = s.x + dx;
      const ny = s.y + dy;

      const blocked =
        isWallOrOutOfBounds(state, nx, ny) ||
        Boolean(getBlockAt(state, nx, ny)) ||
        Boolean(getSentinelAt(state, nx, ny));

      if (blocked) {
        s.dir = oppositeDir(s.dir);
      } else {
        s.x = nx;
        s.y = ny;
      }

      const nextDelta = dirDelta(s.dir);
      const tx = s.x + nextDelta.dx;
      const ty = s.y + nextDelta.dy;
      if (!isWallOrOutOfBounds(state, tx, ty) && !getBlockAt(state, tx, ty)) {
        s.windupActive = true;
        s.windupTargetTiles = [{ x: tx, y: ty }];
      } else {
        s.windupActive = false;
        s.windupTargetTiles = [];
      }
    } else if (s.archetype === 'GAZE_TURRET') {
      if (s.windupActive) {
        const hitPlayer = s.windupTargetTiles.some(
          (t) => isPlayerAt(t.x, t.y) && !getBlockAt(state, t.x, t.y)
        );
        if (hitPlayer) {
          applyPlayerDamage(state, 'Tượng Mắt Thần chiếu tia hóa đá!');
        }
        s.windupActive = false;
        s.windupTargetTiles = [];
        s.dir = rotateClockwise(s.dir);
      } else {
        if (s.stepCounter % 2 === 0) {
          s.dir = rotateClockwise(s.dir);
        }
        const sightTiles: { x: number; y: number }[] = [];
        const { dx, dy } = dirDelta(s.dir);
        let cx = s.x + dx;
        let cy = s.y + dy;
        while (
          !isWallOrOutOfBounds(state, cx, cy) &&
          !getBlockAt(state, cx, cy)
        ) {
          sightTiles.push({ x: cx, y: cy });
          cx += dx;
          cy += dy;
        }
        s.windupTargetTiles = sightTiles;
        if (sightTiles.some((t) => isPlayerAt(t.x, t.y))) {
          s.windupActive = true;
          state.lastEvents.push({ type: 'SENTINEL_WINDUP', x: s.x, y: s.y });
        }
      }
    } else if (s.archetype === 'MIMIC_WRAITH') {
      if (s.windupActive) {
        const hit = s.windupTargetTiles.some((t) => isPlayerAt(t.x, t.y));
        if (hit) {
          applyPlayerDamage(state, 'Bóng Ma Cổ Tự phát nổ xung kích!');
        }
        s.windupActive = false;
        s.windupTargetTiles = [];
      } else if (s.stepCounter % 3 === 2) {
        s.windupActive = true;
        s.windupTargetTiles = [
          { x: s.x, y: s.y },
          { x: s.x + 1, y: s.y },
          { x: s.x - 1, y: s.y },
          { x: s.x, y: s.y + 1 },
          { x: s.x, y: s.y - 1 },
        ].filter((t) => !isWallOrOutOfBounds(state, t.x, t.y));
        state.lastEvents.push({ type: 'SENTINEL_WINDUP', x: s.x, y: s.y });
      } else {
        const diffX = state.playerX - s.x;
        const diffY = state.playerY - s.y;
        const candidateDirs: Direction[] =
          Math.abs(diffX) >= Math.abs(diffY)
            ? [diffX >= 0 ? 'RIGHT' : 'LEFT', diffY >= 0 ? 'DOWN' : 'UP']
            : [diffY >= 0 ? 'DOWN' : 'UP', diffX >= 0 ? 'RIGHT' : 'LEFT'];

        for (const cand of candidateDirs) {
          const { dx, dy } = dirDelta(cand);
          const nx = s.x + dx;
          const ny = s.y + dy;
          if (
            !isWallOrOutOfBounds(state, nx, ny) &&
            !getBlockAt(state, nx, ny) &&
            !getSentinelAt(state, nx, ny)
          ) {
            s.dir = cand;
            s.x = nx;
            s.y = ny;
            break;
          }
        }
      }
    }
  }

  recalculateBoardEnvironment(state, true);

  if (
    state.tiles[state.playerY][state.playerX] === 'SPIKE_ON' ||
    (state.isCoop &&
      state.player2Y >= 0 &&
      state.tiles[state.player2Y][state.player2X] === 'SPIKE_ON')
  ) {
    applyPlayerDamage(state, 'Bạn dẫm phải bẫy gai cổ đại!');
  }

  if (
    getSentinelAt(state, state.playerX, state.playerY) ||
    (state.isCoop && getSentinelAt(state, state.player2X, state.player2Y))
  ) {
    applyPlayerDamage(state, 'Bạn chạm trán Vệ Binh Đền Cổ!');
  }
}

function applyPlayerDamage(state: PuzzleState, reason: string): void {
  state.hp = Math.max(0, state.hp - 1);
  state.lastEvents.push({
    type: 'PLAYER_HURT',
    x: state.playerX,
    y: state.playerY,
    reason,
  });
  if (state.hp <= 0) {
    state.status = 'DEFEAT';
  }
}

function slideEntityPosition(
  state: PuzzleState,
  startX: number,
  startY: number,
  dir: Direction,
  isBlock: boolean,
  role: PlayerRole,
  movingBlock?: BlockEntity
): { x: number; y: number; slid: boolean } {
  let cx = startX;
  let cy = startY;
  let slid = false;
  const { dx, dy } = dirDelta(dir);

  if (state.tiles[cy][cx] === 'TELEPORTER') {
    const twin = findTwinTeleporter(state, cx, cy);
    if (twin) {
      const exitX = twin.x + dx;
      const exitY = twin.y + dy;
      const blockedByWall = isBlock
        ? isTileBlockedForBlock(state, exitX, exitY, movingBlock?.owner)
        : isTileBlockedForRole(state, exitX, exitY, role);
      const canExit =
        !blockedByWall &&
        !state.blocks.some(
          (b) => b.id !== movingBlock?.id && b.x === exitX && b.y === exitY
        );
      if (canExit) {
        state.lastEvents.push({
          type: 'TELEPORT',
          fromX: cx,
          fromY: cy,
          toX: exitX,
          toY: exitY,
        });
        cx = exitX;
        cy = exitY;
        slid = true;
      }
    }
  }

  let safety = 0;
  while (state.tiles[cy][cx] === 'ICE' && safety < 32) {
    safety++;
    const nx = cx + dx;
    const ny = cy + dy;
    const blockedByTile = isBlock
      ? isTileBlockedForBlock(state, nx, ny, movingBlock?.owner)
      : isTileBlockedForRole(state, nx, ny, role);
    if (blockedByTile) break;

    const blockingBlock = state.blocks.some(
      (b) => b.id !== movingBlock?.id && b.x === nx && b.y === ny
    );
    if (blockingBlock) break;

    // Also stop if sliding into the other co-op player
    if (
      state.isCoop &&
      ((role === 'P1' && state.player2X === nx && state.player2Y === ny) ||
        (role === 'P2' && state.playerX === nx && state.playerY === ny) ||
        (isBlock &&
          ((state.playerX === nx && state.playerY === ny) ||
            (state.player2X === nx && state.player2Y === ny))))
    ) {
      break;
    }

    const sentinel = getSentinelAt(state, nx, ny);
    if (sentinel) {
      if (isBlock) {
        sentinel.alive = false;
        sentinel.windupActive = false;
        sentinel.windupTargetTiles = [];
        state.lastEvents.push({ type: 'SENTINEL_DESTROYED', x: nx, y: ny });
      } else {
        cx = nx;
        cy = ny;
        slid = true;
        break;
      }
    }

    cx = nx;
    cy = ny;
    slid = true;
  }

  return { x: cx, y: cy, slid };
}

/**
 * Executes a player move in `dir` for `role` ('P1' default or 'P2').
 */
export function stepPlayerMove(
  state: PuzzleState,
  dir: Direction,
  role: PlayerRole = 'P1'
): boolean {
  if (state.status !== 'PLAYING') return false;
  if (role === 'P2' && (!state.isCoop || state.player2X < 0)) return false;

  state.lastEvents = [];
  if (role === 'P1') {
    state.playerDir = dir;
  } else {
    state.player2Dir = dir;
  }

  const curX = role === 'P1' ? state.playerX : state.player2X;
  const curY = role === 'P1' ? state.playerY : state.player2Y;
  const otherX = role === 'P1' ? state.player2X : state.playerX;
  const otherY = role === 'P1' ? state.player2Y : state.playerY;

  const { dx, dy } = dirDelta(dir);
  const targetX = curX + dx;
  const targetY = curY + dy;

  // Cannot walk into walls, wrong-color barriers, crystals, or the other player
  if (
    isTileBlockedForRole(state, targetX, targetY, role) ||
    getCrystalAt(state, targetX, targetY) ||
    (state.isCoop && targetX === otherX && targetY === otherY)
  ) {
    state.lastEvents.push({ type: 'BUMP_WALL', role, x: targetX, y: targetY });
    return false;
  }

  const block = getBlockAt(state, targetX, targetY);
  if (block) {
    // Check character-color ownership permission on the block
    if (!canRoleInteractWithOwner(role, block.owner)) {
      state.lastEvents.push({ type: 'BUMP_WALL', role, x: targetX, y: targetY });
      return false;
    }

    const pushX = targetX + dx;
    const pushY = targetY + dy;
    if (
      isTileBlockedForBlock(state, pushX, pushY, block.owner) ||
      getBlockAt(state, pushX, pushY) ||
      getCrystalAt(state, pushX, pushY) ||
      getSentinelAt(state, pushX, pushY) ||
      (state.isCoop && pushX === otherX && pushY === otherY)
    ) {
      state.lastEvents.push({ type: 'BUMP_WALL', role, x: targetX, y: targetY });
      return false;
    }

    state.history.push(cloneSnapshot(state));

    const wasOnPlate = state.tiles[block.y][block.x] === 'PLATE';
    const slideResult = slideEntityPosition(
      state,
      pushX,
      pushY,
      dir,
      true,
      role,
      block
    );
    block.x = slideResult.x;
    block.y = slideResult.y;

    if (role === 'P1') {
      state.playerX = targetX;
      state.playerY = targetY;
    } else {
      state.player2X = targetX;
      state.player2Y = targetY;
    }
    state.moves++;

    state.lastEvents.push({
      type: 'PUSH_BLOCK',
      role,
      x: block.x,
      y: block.y,
      slid: slideResult.slid,
    });

    if (!wasOnPlate && state.tiles[block.y][block.x] === 'PLATE') {
      state.lastEvents.push({ type: 'PLATE_ACTIVATED', x: block.x, y: block.y });
    }
  } else {
    state.history.push(cloneSnapshot(state));

    const slideResult = slideEntityPosition(
      state,
      targetX,
      targetY,
      dir,
      false,
      role
    );
    if (role === 'P1') {
      state.playerX = slideResult.x;
      state.playerY = slideResult.y;
    } else {
      state.player2X = slideResult.x;
      state.player2Y = slideResult.y;
    }
    state.moves++;

    state.lastEvents.push({
      type: 'MOVE',
      role,
      x: role === 'P1' ? state.playerX : state.player2X,
      y: role === 'P1' ? state.playerY : state.player2Y,
    });
  }

  recalculateBoardEnvironment(state, true);
  if (state.status === 'PLAYING') {
    stepSentinelsAndHazards(state);
  }

  return true;
}

/**
 * Rotates an adjacent Mirror Block for `role` ('P1' or 'P2'), respecting color ownership.
 */
export function rotateAdjacentMirror(
  state: PuzzleState,
  role: PlayerRole = 'P1'
): boolean {
  if (state.status !== 'PLAYING') return false;
  if (role === 'P2' && (!state.isCoop || state.player2X < 0)) return false;

  state.lastEvents = [];
  const curX = role === 'P1' ? state.playerX : state.player2X;
  const curY = role === 'P1' ? state.playerY : state.player2Y;
  const curDir = role === 'P1' ? state.playerDir : state.player2Dir;

  const checkOrder: Direction[] = [curDir, 'UP', 'RIGHT', 'DOWN', 'LEFT'];

  let targetMirror: BlockEntity | undefined;
  for (const dir of checkOrder) {
    const { dx, dy } = dirDelta(dir);
    const b = getBlockAt(state, curX + dx, curY + dy);
    if (b && b.kind === 'MIRROR' && canRoleInteractWithOwner(role, b.owner)) {
      targetMirror = b;
      if (role === 'P1') state.playerDir = dir;
      else state.player2Dir = dir;
      break;
    }
  }

  if (!targetMirror) {
    state.lastEvents.push({
      type: 'BUMP_WALL',
      role,
      x: curX,
      y: curY,
    });
    return false;
  }

  state.history.push(cloneSnapshot(state));
  targetMirror.mirrorAngle =
    targetMirror.mirrorAngle === 'SLASH' ? 'BACKSLASH' : 'SLASH';
  state.moves++;

  state.lastEvents.push({
    type: 'ROTATE_MIRROR',
    role,
    x: targetMirror.x,
    y: targetMirror.y,
    angle: targetMirror.mirrorAngle,
  });

  recalculateBoardEnvironment(state, true);
  if (state.status === 'PLAYING') {
    stepSentinelsAndHazards(state);
  }
  return true;
}

export function undoLastMove(state: PuzzleState): boolean {
  const snap = state.history.pop();
  if (!snap) return false;

  state.playerX = snap.playerX;
  state.playerY = snap.playerY;
  state.playerDir = snap.playerDir;
  state.player2X = snap.player2X;
  state.player2Y = snap.player2Y;
  state.player2Dir = snap.player2Dir;
  state.hp = snap.hp;
  state.moves = snap.moves;
  state.tiles = snap.tiles.map((row) => [...row]);
  state.blocks = snap.blocks.map((b) => ({ ...b }));
  state.crystals = snap.crystals.map((c) => ({ ...c }));
  state.sentinels = snap.sentinels.map((s) => ({
    ...s,
    windupTargetTiles: s.windupTargetTiles.map((t) => ({ ...t })),
  }));
  state.status = 'PLAYING';
  state.lastEvents = [];

  recalculateBoardEnvironment(state, false);
  return true;
}

export function calculateStars(
  moves: number,
  parMoves: number,
  hp: number
): number {
  if (hp <= 0) return 0;
  if (moves <= parMoves && hp === 3) return 3;
  if (moves <= Math.ceil(parMoves * 1.4)) return 2;
  return 1;
}
