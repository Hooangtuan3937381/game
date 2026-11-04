/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GameHud,
  HudSnapshot,
  PublicRoomInfo,
  ShellState,
} from './components/GameHud';
import { Direction, LEVELS, PlayerRole } from './game/levels';
import { PixelSceneRenderer } from './game/pixelArt';
import {
  calculateStars,
  canRoleInteractWithOwner,
  createLevelState,
  dirDelta,
  getBlockAt,
  PuzzleState,
  rotateAdjacentMirror,
  stepPlayerMove,
  undoLastMove,
} from './game/rules';
import { soundEngine } from './game/sound';
import { buildRoomInviteUrl, normalizeCustomDomain } from './utils/domainShare';

function checkHasAdjacentMirror(state: PuzzleState, role: PlayerRole): boolean {
  const curX = role === 'P1' ? state.playerX : state.player2X;
  const curY = role === 'P1' ? state.playerY : state.player2Y;
  if (curX < 0 || curY < 0) return false;
  const dirs: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
  for (const d of dirs) {
    const { dx, dy } = dirDelta(d);
    const b = getBlockAt(state, curX + dx, curY + dy);
    if (b && b.kind === 'MIRROR' && canRoleInteractWithOwner(role, b.owner)) {
      return true;
    }
  }
  return false;
}

function buildHudSnapshot(
  state: PuzzleState,
  elapsedSec: number,
  defeatReason: string,
  activeRole: PlayerRole
): HudSnapshot {
  return {
    levelId: state.levelId,
    level: state.level,
    isCoop: state.isCoop,
    moves: state.moves,
    hp: state.hp,
    maxHp: state.maxHp,
    activatedPlates: state.activatedPlates,
    totalPlates: state.totalPlates,
    poweredCrystals: state.poweredCrystals,
    totalCrystals: state.totalCrystals,
    portalOpen: state.portalOpen,
    p1OnExit: state.p1OnExit,
    p2OnExit: state.p2OnExit,
    canUndo: state.history.length > 0,
    hasAdjacentMirror: checkHasAdjacentMirror(state, activeRole),
    elapsedSec,
    outcome:
      state.status === 'VICTORY'
        ? 'VICTORY'
        : state.status === 'DEFEAT'
          ? 'DEFEAT'
          : 'NONE',
    defeatReason,
  };
}

export default function App() {
  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
  const isAutostart = searchParams?.get('autostart') === '1';
  const initialRoomParam = searchParams?.get('room')?.trim().toUpperCase() || '';

  const initialShell: ShellState =
    isAutostart || initialRoomParam ? 'playing' : 'title';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<PixelSceneRenderer>(new PixelSceneRenderer());
  const puzzleRef = useRef<PuzzleState>(
    createLevelState(initialRoomParam ? 11 : 1)
  );
  const shellStateRef = useRef<ShellState>(initialShell);
  const activeRoleRef = useRef<PlayerRole>('P1');
  const elapsedSecRef = useRef<number>(0);
  const defeatReasonRef = useRef<string>('');
  const hintTargetRef = useRef<{ x: number; y: number } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const activeRoomRef = useRef<PublicRoomInfo | null>(null);
  const dirtyFramesRef = useRef<number>(30);

  const markCanvasDirty = useCallback((frames = 28) => {
    dirtyFramesRef.current = Math.max(dirtyFramesRef.current, frames);
  }, []);

  const [shellState, setShellState] = useState<ShellState>(initialShell);
  const [activeControlRole, setActiveControlRole] = useState<PlayerRole>('P1');
  const [pingModeActive, setPingModeActive] = useState<boolean>(false);
  const [activeRoom, setActiveRoom] = useState<PublicRoomInfo | null>(null);
  const [assignedRoomRole, setAssignedRoomRole] = useState<PlayerRole | null>(
    null
  );
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [copiedRoomCode, setCopiedRoomCode] = useState<boolean>(false);

  const [hud, setHud] = useState<HudSnapshot>(() =>
    buildHudSnapshot(puzzleRef.current, 0, '', 'P1')
  );
  const [muted, setMuted] = useState<boolean>(false);
  const [highestUnlockedLevel, setHighestUnlockedLevel] = useState<number>(15);
  const [bestStarsByLevel, setBestStarsByLevel] = useState<
    Record<number, number>
  >({});
  const [activeHintText, setActiveHintText] = useState<string | null>(null);
  const [showStageModal, setShowStageModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [showCoopModal, setShowCoopModal] = useState<boolean>(false);
  const [showDomainQrModal, setShowDomainQrModal] = useState<boolean>(false);
  const [customDomain, setCustomDomain] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem('chrono_custom_domain') || '';
    } catch {
      return '';
    }
  });

  const updateShellState = useCallback((next: ShellState) => {
    shellStateRef.current = next;
    dirtyFramesRef.current = 30;
    if (typeof document !== 'undefined') {
      document.body.dataset.state = next;
    }
    setShellState(next);
  }, []);

  useEffect(() => {
    document.body.dataset.state = initialShell;
    rendererRef.current.syncStateInstant(puzzleRef.current);
    dirtyFramesRef.current = 30;
  }, [initialShell]);

  const syncHudFromRef = useCallback(() => {
    dirtyFramesRef.current = 30;
    setHud(
      buildHudSnapshot(
        puzzleRef.current,
        Math.floor(elapsedSecRef.current),
        defeatReasonRef.current,
        activeRoleRef.current
      )
    );
  }, []);

  const processFeedbackEvents = useCallback(() => {
    const state = puzzleRef.current;
    const renderer = rendererRef.current;

    for (const ev of state.lastEvents) {
      switch (ev.type) {
        case 'MOVE':
          soundEngine.playStep();
          renderer.triggerSquash(1.16, 0.86, ev.role);
          renderer.spawnBurst(
            ev.x,
            ev.y,
            4,
            ev.role === 'P2' ? '#38bdf8' : '#94a3b8',
            0.6
          );
          break;
        case 'PUSH_BLOCK':
          soundEngine.playPush(ev.slid);
          renderer.triggerSquash(1.22, 0.78, ev.role);
          renderer.spawnBurst(
            ev.x,
            ev.y,
            ev.slid ? 10 : 6,
            ev.role === 'P2' ? '#38bdf8' : '#fbbf24',
            0.9
          );
          break;
        case 'ROTATE_MIRROR':
          soundEngine.playRotateMirror();
          renderer.spawnBurst(ev.x, ev.y, 10, '#38bdf8', 1.0);
          break;
        case 'PLATE_ACTIVATED':
          soundEngine.playPlateActivate();
          renderer.spawnBurst(ev.x, ev.y, 14, '#fef08a', 1.2);
          break;
        case 'CRYSTAL_POWERED':
          soundEngine.playCrystalPower();
          renderer.spawnBurst(ev.x, ev.y, 16, '#fb7185', 1.3);
          break;
        case 'TELEPORT':
          soundEngine.playTeleport();
          renderer.spawnBurst(ev.fromX, ev.fromY, 12, '#818cf8', 1.1);
          renderer.spawnBurst(ev.toX, ev.toY, 14, '#c7d2fe', 1.2);
          break;
        case 'SENTINEL_DESTROYED':
          soundEngine.playSentinelDestroy();
          renderer.triggerShake(0.55, 0.055);
          renderer.spawnBurst(ev.x, ev.y, 22, '#ef4444', 1.5);
          break;
        case 'SENTINEL_WINDUP':
          soundEngine.playWindup();
          break;
        case 'BUMP_WALL':
          soundEngine.playBump();
          renderer.triggerSquash(0.88, 1.12, ev.role);
          break;
        case 'PLAYER_HURT':
          soundEngine.playHurt();
          defeatReasonRef.current = ev.reason;
          renderer.hitFlashTimer = 0.16;
          renderer.triggerShake(0.75, 0.065);
          renderer.spawnBurst(ev.x, ev.y, 20, '#f43f5e', 1.4);
          break;
        case 'PORTAL_OPENED':
          soundEngine.playPortalOpen();
          renderer.triggerShake(0.35, 0.035);
          break;
        case 'STAGE_CLEAR': {
          soundEngine.playVictory();
          renderer.spawnBurst(state.playerX, state.playerY, 26, '#34d399', 1.6);
          const stars = calculateStars(
            state.moves,
            state.level.parMoves,
            state.hp
          );
          setBestStarsByLevel((prev) => ({
            ...prev,
            [state.levelId]: Math.max(prev[state.levelId] || 0, stars),
          }));
          setHighestUnlockedLevel((prev) =>
            Math.min(LEVELS.length, Math.max(prev, state.levelId + 1))
          );
          updateShellState('gameover');
          break;
        }
      }
    }

    if (state.status === 'DEFEAT') {
      updateShellState('gameover');
    }
  }, [updateShellState]);

  const sendWsMessage = useCallback((payload: unknown): boolean => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  // Connect to Authoritative WebSocket Server on port 3000 (/ws)
  useEffect(() => {
    let reconnectTimer = 0;
    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmounted) return;
        setWsConnected(true);
        ws.send(JSON.stringify({ type: 'lobby:subscribe' }));

        if (initialRoomParam && !activeRoomRef.current) {
          ws.send(
            JSON.stringify({
              type: 'room:join',
              roomId: initialRoomParam,
              playerName: 'Pháp Sư Đồng Hành',
            })
          );
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data));
          if (!msg || typeof msg.type !== 'string') return;

          if (msg.type === 'lobby:list') {
            setPublicRooms(Array.isArray(msg.rooms) ? msg.rooms : []);
            return;
          }

          if (msg.type === 'room:joined') {
            const roomInfo = msg.room as PublicRoomInfo;
            const role = (msg.assignedRole as PlayerRole) || 'P1';
            activeRoomRef.current = roomInfo;
            setActiveRoom(roomInfo);
            setAssignedRoomRole(role);
            activeRoleRef.current = role;
            setActiveControlRole(role);

            if (msg.puzzleState) {
              const prevLevelId = puzzleRef.current.levelId;
              puzzleRef.current = msg.puzzleState as PuzzleState;
              if (prevLevelId !== puzzleRef.current.levelId) {
                rendererRef.current.syncStateInstant(puzzleRef.current);
              }
              processFeedbackEvents();
            }

            // Update URL query parameter ?room=CODE without reloading
            const url = new URL(window.location.href);
            url.searchParams.set('room', roomInfo.roomId);
            window.history.replaceState({}, '', url.toString());

            setShowCoopModal(false);
            updateShellState('playing');
            syncHudFromRef();
            return;
          }

          if (msg.type === 'room:state') {
            const roomInfo = msg.room as PublicRoomInfo;
            activeRoomRef.current = roomInfo;
            setActiveRoom(roomInfo);

            if (msg.puzzleState) {
              const incoming = msg.puzzleState as PuzzleState;
              const levelChanged =
                incoming.levelId !== puzzleRef.current.levelId ||
                incoming.moves === 0;
              puzzleRef.current = incoming;
              if (levelChanged) {
                elapsedSecRef.current = 0;
                defeatReasonRef.current = '';
                rendererRef.current.syncStateInstant(incoming);
                if (shellStateRef.current === 'gameover') {
                  updateShellState('playing');
                }
              }
              processFeedbackEvents();
              syncHudFromRef();
            }
            return;
          }

          if (msg.type === 'room:left') {
            activeRoomRef.current = null;
            setActiveRoom(null);
            setAssignedRoomRole(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('room');
            window.history.replaceState({}, '', url.toString());
            return;
          }

          if (msg.type === 'game:ping') {
            soundEngine.playRotateMirror();
            rendererRef.current.addPing(
              Number(msg.x),
              Number(msg.y),
              (msg.role as PlayerRole) || 'P1',
              String(msg.senderName || 'Đồng Đội')
            );
            return;
          }
        } catch {
          // Ignore malformed WS message
        }
      };

      ws.onclose = () => {
        if (isUnmounted) return;
        setWsConnected(false);
        reconnectTimer = window.setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      isUnmounted = true;
      window.clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [
    initialRoomParam,
    processFeedbackEvents,
    syncHudFromRef,
    updateShellState,
  ]);

  const handleStartGame = useCallback(
    (targetLevelId?: number) => {
      const lvlId = targetLevelId ?? puzzleRef.current.levelId;

      if (activeRoomRef.current) {
        sendWsMessage({ type: 'room:select_level', levelId: lvlId });
      }

      const freshState = createLevelState(lvlId);
      puzzleRef.current = freshState;
      activeRoleRef.current = assignedRoomRole || 'P1';
      setActiveControlRole(activeRoleRef.current);
      elapsedSecRef.current = 0;
      defeatReasonRef.current = '';
      hintTargetRef.current = null;
      setActiveHintText(null);
      setShowStageModal(false);
      setShowGuideModal(false);
      setShowCoopModal(false);
      rendererRef.current.syncStateInstant(freshState);

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      updateShellState('playing');
      syncHudFromRef();
    },
    [assignedRoomRole, sendWsMessage, syncHudFromRef, updateShellState]
  );

  const handleRestartLevel = useCallback(() => {
    if (activeRoomRef.current && sendWsMessage({ type: 'game:restart' })) {
      return;
    }
    handleStartGame(puzzleRef.current.levelId);
  }, [handleStartGame, sendWsMessage]);

  const handleToggleControlRole = useCallback(() => {
    if (!puzzleRef.current.isCoop) return;
    const nextRole: PlayerRole = activeRoleRef.current === 'P1' ? 'P2' : 'P1';
    activeRoleRef.current = nextRole;
    setActiveControlRole(nextRole);
    soundEngine.playStep();
    syncHudFromRef();
  }, [syncHudFromRef]);

  const handleStepDirection = useCallback(
    (dir: Direction) => {
      if (shellStateRef.current !== 'playing') return;
      hintTargetRef.current = null;
      const role = puzzleRef.current.isCoop ? activeRoleRef.current : 'P1';

      // Optimistic local step + authoritative WS broadcast if in an online room
      stepPlayerMove(puzzleRef.current, dir, role);
      processFeedbackEvents();
      syncHudFromRef();

      if (activeRoomRef.current) {
        sendWsMessage({ type: 'game:move', dir, role });
      }
    },
    [processFeedbackEvents, sendWsMessage, syncHudFromRef]
  );

  const handleRotateMirror = useCallback(() => {
    if (shellStateRef.current !== 'playing') return;
    hintTargetRef.current = null;
    const role = puzzleRef.current.isCoop ? activeRoleRef.current : 'P1';

    rotateAdjacentMirror(puzzleRef.current, role);
    processFeedbackEvents();
    syncHudFromRef();

    if (activeRoomRef.current) {
      sendWsMessage({ type: 'game:rotate', role });
    }
  }, [processFeedbackEvents, sendWsMessage, syncHudFromRef]);

  const handleUndoMove = useCallback(() => {
    if (
      shellStateRef.current !== 'playing' &&
      shellStateRef.current !== 'gameover'
    ) {
      return;
    }
    if (activeRoomRef.current) {
      sendWsMessage({ type: 'game:undo' });
    }
    if (undoLastMove(puzzleRef.current)) {
      soundEngine.playUndo();
      rendererRef.current.syncStateInstant(puzzleRef.current);
      if (shellStateRef.current === 'gameover') {
        updateShellState('playing');
      }
      syncHudFromRef();
    }
  }, [sendWsMessage, syncHudFromRef, updateShellState]);

  const handleTriggerHint = useCallback(() => {
    const state = puzzleRef.current;
    setActiveHintText(state.level.hintText);

    let target: { x: number; y: number } | null = null;
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (state.tiles[y][x] === 'PLATE' && !getBlockAt(state, x, y)) {
          target = { x, y };
          break;
        }
      }
      if (target) break;
    }
    if (!target && state.crystals.length > 0) {
      const unpowered = state.crystals.find((c) => !c.powered);
      if (unpowered) target = { x: unpowered.x, y: unpowered.y };
    }
    if (!target) {
      for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
          const t = state.tiles[y][x];
          if (t === 'EXIT' || t === 'EXIT_P1' || t === 'EXIT_P2') {
            target = { x, y };
          }
        }
      }
    }
    hintTargetRef.current = target;
    soundEngine.playRotateMirror();
  }, []);

  const handleToggleMute = useCallback(() => {
    soundEngine.muted = !soundEngine.muted;
    setMuted(soundEngine.muted);
  }, []);

  const handleCreateOnlineRoom = useCallback(
    (opts: {
      playerName: string;
      roomName: string;
      isPublic: boolean;
      levelId: number;
    }) => {
      if (!sendWsMessage({ type: 'room:create', ...opts })) {
        // Fallback if WS is still connecting: start Co-op level immediately
        handleStartGame(opts.levelId);
      }
    },
    [handleStartGame, sendWsMessage]
  );

  const handleJoinOnlineRoom = useCallback(
    (roomId: string, playerName: string) => {
      sendWsMessage({ type: 'room:join', roomId, playerName });
    },
    [sendWsMessage]
  );

  const handleLeaveOnlineRoom = useCallback(() => {
    sendWsMessage({ type: 'room:leave' });
    activeRoomRef.current = null;
    setActiveRoom(null);
    setAssignedRoomRole(null);
  }, [sendWsMessage]);

  const handleSaveCustomDomain = useCallback((domain: string) => {
    const res = normalizeCustomDomain(domain);
    const cleaned = res.valid ? res.normalized : '';
    setCustomDomain(cleaned);
    try {
      if (cleaned) {
        window.localStorage.setItem('chrono_custom_domain', cleaned);
      } else {
        window.localStorage.removeItem('chrono_custom_domain');
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleCopyRoomInvite = useCallback(() => {
    const roomId = activeRoomRef.current?.roomId || initialRoomParam || null;
    const url = buildRoomInviteUrl(window.location.origin, customDomain, roomId);
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedRoomCode(true);
    window.setTimeout(() => setCopiedRoomCode(false), 2000);
  }, [customDomain, initialRoomParam]);

  // Unified Keyboard Input Listener
  useEffect(() => {
    const heldKeys = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      // Do not intercept typing when an input/select is focused
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA') {
        if (e.code === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      const code = e.code;

      if (code === 'Escape') {
        if (showStageModal || showGuideModal || showCoopModal || showDomainQrModal) {
          setShowStageModal(false);
          setShowGuideModal(false);
          setShowCoopModal(false);
          setShowDomainQrModal(false);
          return;
        }
      }

      if (shellStateRef.current === 'title') {
        if (
          (code === 'Enter' || code === 'Space') &&
          !showStageModal &&
          !showGuideModal &&
          !showCoopModal &&
          !showDomainQrModal
        ) {
          e.preventDefault();
          handleStartGame(puzzleRef.current.levelId);
        }
        return;
      }

      if (shellStateRef.current === 'gameover') {
        if (code === 'Enter' || code === 'Space') {
          e.preventDefault();
          if (
            puzzleRef.current.status === 'VICTORY' &&
            puzzleRef.current.levelId < LEVELS.length
          ) {
            handleStartGame(puzzleRef.current.levelId + 1);
          } else {
            handleRestartLevel();
          }
          return;
        }
        if (code === 'KeyZ') {
          e.preventDefault();
          handleUndoMove();
          return;
        }
      }

      if (code === 'Escape' || code === 'KeyP') {
        e.preventDefault();
        if (shellStateRef.current === 'playing') {
          updateShellState('paused');
        } else if (shellStateRef.current === 'paused') {
          updateShellState('playing');
        }
        return;
      }

      if (shellStateRef.current !== 'playing') return;

      if (heldKeys.has(code)) return;
      heldKeys.add(code);

      if (code === 'Tab') {
        e.preventDefault();
        handleToggleControlRole();
      } else if (code === 'KeyW' || code === 'ArrowUp') {
        e.preventDefault();
        handleStepDirection('UP');
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        e.preventDefault();
        handleStepDirection('DOWN');
      } else if (code === 'KeyA' || code === 'ArrowLeft') {
        e.preventDefault();
        handleStepDirection('LEFT');
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        e.preventDefault();
        handleStepDirection('RIGHT');
      } else if (code === 'Space' || code === 'KeyE') {
        e.preventDefault();
        handleRotateMirror();
      } else if (code === 'KeyZ' || code === 'Backspace') {
        e.preventDefault();
        handleUndoMove();
      } else if (code === 'KeyR') {
        e.preventDefault();
        handleRestartLevel();
      } else if (code === 'KeyH') {
        e.preventDefault();
        handleTriggerHint();
      } else if (code === 'KeyG') {
        e.preventDefault();
        setPingModeActive((v) => !v);
      } else if (code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
      } else if (code === 'KeyL') {
        e.preventDefault();
        setShowStageModal((v) => !v);
      } else if (code === 'KeyO') {
        e.preventDefault();
        setShowCoopModal((v) => !v);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeys.delete(e.code);
    };

    const clearHeldKeys = () => {
      heldKeys.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeldKeys);
    document.addEventListener('visibilitychange', clearHeldKeys);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHeldKeys);
      document.removeEventListener('visibilitychange', clearHeldKeys);
    };
  }, [
    handleRestartLevel,
    handleRotateMirror,
    handleStartGame,
    handleStepDirection,
    handleToggleControlRole,
    handleToggleMute,
    handleTriggerHint,
    handleUndoMove,
    showCoopModal,
    showDomainQrModal,
    showGuideModal,
    showStageModal,
    updateShellState,
  ]);

  // Isolated 60fps Canvas Loop with 16ms afterDraw yield
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(320, Math.floor(rect.width));
      canvas.height = Math.max(240, Math.floor(rect.height));
      dirtyFramesRef.current = 30;
    };

    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas);

    let rafId = 0;
    let timerId = 0;
    let lastTime = performance.now();
    let lastHudTimerSec = 0;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      if (shellStateRef.current === 'playing') {
        elapsedSecRef.current += dt;
        const floored = Math.floor(elapsedSecRef.current);
        if (floored !== lastHudTimerSec) {
          lastHudTimerSec = floored;
          setHud(
            buildHudSnapshot(
              puzzleRef.current,
              floored,
              defeatReasonRef.current,
              activeRoleRef.current
            )
          );
        }
      }

      if (dirtyFramesRef.current > 0) {
        dirtyFramesRef.current--;
        rendererRef.current.update(dt, puzzleRef.current);
        rendererRef.current.render(
          ctx,
          canvas.width,
          canvas.height,
          puzzleRef.current,
          now / 1000,
          shellStateRef.current === 'title',
          hintTargetRef.current,
          activeRoleRef.current
        );
      }

      timerId = window.setTimeout(() => {
        rafId = requestAnimationFrame(tick);
      }, 32);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      window.clearTimeout(timerId);
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const handleCanvasPointerDown = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (shellStateRef.current !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const state = puzzleRef.current;
    const { tileSize, offsetX, offsetY } = rendererRef.current.getBoardMetrics(
      canvas.width,
      canvas.height,
      state,
      false
    );

    const gx = Math.floor((clientX - offsetX) / tileSize);
    const gy = Math.floor((clientY - offsetY) / tileSize);
    if (gx < 0 || gy < 0 || gx >= state.width || gy >= state.height) return;

    // If Ping Mode is active or right-clicked, emit map ping beacon on tile (gx, gy)
    if (pingModeActive || e.button === 2) {
      const role = state.isCoop ? activeRoleRef.current : 'P1';
      soundEngine.playRotateMirror();
      rendererRef.current.addPing(gx, gy, role, role);
      if (activeRoomRef.current) {
        sendWsMessage({ type: 'game:ping', x: gx, y: gy, role });
      }
      setPingModeActive(false);
      return;
    }

    const role = state.isCoop ? activeRoleRef.current : 'P1';
    const curX = role === 'P1' ? state.playerX : state.player2X;
    const curY = role === 'P1' ? state.playerY : state.player2Y;

    // Clicking directly on the other Co-op character switches active control role
    if (
      state.isCoop &&
      ((role === 'P1' && gx === state.player2X && gy === state.player2Y) ||
        (role === 'P2' && gx === state.playerX && gy === state.playerY))
    ) {
      handleToggleControlRole();
      return;
    }

    const dx = gx - curX;
    const dy = gy - curY;

    if (dx === 0 && dy === 0) {
      handleRotateMirror();
      return;
    }

    if (Math.abs(dx) + Math.abs(dy) >= 1) {
      if (Math.abs(dx) >= Math.abs(dy)) {
        handleStepDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        handleStepDirection(dy > 0 ? 'DOWN' : 'UP');
      }
    }
  };

  return (
    <main
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-screen h-screen overflow-hidden bg-[#0b0e14] select-none"
    >
      <canvas
        ref={canvasRef}
        data-testid="puzzle-canvas"
        onPointerDown={handleCanvasPointerDown}
        className="block w-full h-full pixelated cursor-pointer"
      />

      <GameHud
        shellState={shellState}
        hud={hud}
        muted={muted}
        activeControlRole={activeControlRole}
        pingModeActive={pingModeActive}
        activeRoom={activeRoom}
        assignedRoomRole={assignedRoomRole}
        publicRooms={publicRooms}
        wsConnected={wsConnected}
        copiedRoomCode={copiedRoomCode}
        highestUnlockedLevel={highestUnlockedLevel}
        bestStarsByLevel={bestStarsByLevel}
        activeHintText={activeHintText}
        showStageModal={showStageModal}
        showGuideModal={showGuideModal}
        showCoopModal={showCoopModal}
        showDomainQrModal={showDomainQrModal}
        customDomain={customDomain}
        onStartGame={handleStartGame}
        onResumeGame={() => updateShellState('playing')}
        onPauseGame={() => updateShellState('paused')}
        onRestartLevel={handleRestartLevel}
        onUndoMove={handleUndoMove}
        onRotateMirror={handleRotateMirror}
        onStepDirection={handleStepDirection}
        onToggleControlRole={handleToggleControlRole}
        onTogglePingMode={() => setPingModeActive((v) => !v)}
        onTriggerHint={handleTriggerHint}
        onToggleMute={handleToggleMute}
        onToggleStageModal={setShowStageModal}
        onToggleGuideModal={setShowGuideModal}
        onToggleCoopModal={setShowCoopModal}
        onToggleDomainQrModal={setShowDomainQrModal}
        onSaveCustomDomain={handleSaveCustomDomain}
        onCreateOnlineRoom={handleCreateOnlineRoom}
        onJoinOnlineRoom={handleJoinOnlineRoom}
        onLeaveOnlineRoom={handleLeaveOnlineRoom}
        onCopyRoomInvite={handleCopyRoomInvite}
        onReturnTitle={() => updateShellState('title')}
      />
    </main>
  );
}
