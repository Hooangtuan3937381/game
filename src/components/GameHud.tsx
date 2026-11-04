import React, { useState } from 'react';
import { Direction, LEVELS, LevelDefinition, PlayerRole } from '../game/levels';
import { calculateStars } from '../game/rules';
import { DomainQrModal } from './DomainQrModal';
import {
  CrystalIconSvg,
  RunePlateIconSvg,
  TitleEmblemSvg,
  VitalityPipSvg,
} from './SvgIcons';

export type ShellState = 'title' | 'playing' | 'paused' | 'gameover';

export interface PublicRoomInfo {
  roomId: string;
  roomName: string;
  isPublic: boolean;
  levelId: number;
  levelTitle: string;
  playerCount: number;
  maxPlayers: number;
  players: { name: string; role: PlayerRole }[];
}

export interface HudSnapshot {
  levelId: number;
  level: LevelDefinition;
  isCoop: boolean;
  moves: number;
  hp: number;
  maxHp: number;
  activatedPlates: number;
  totalPlates: number;
  poweredCrystals: number;
  totalCrystals: number;
  portalOpen: boolean;
  p1OnExit: boolean;
  p2OnExit: boolean;
  canUndo: boolean;
  hasAdjacentMirror: boolean;
  elapsedSec: number;
  outcome: 'NONE' | 'VICTORY' | 'DEFEAT';
  defeatReason: string;
}

interface GameHudProps {
  shellState: ShellState;
  hud: HudSnapshot;
  muted: boolean;
  activeControlRole: PlayerRole;
  pingModeActive: boolean;
  activeRoom: PublicRoomInfo | null;
  assignedRoomRole: PlayerRole | null;
  publicRooms: PublicRoomInfo[];
  wsConnected: boolean;
  copiedRoomCode: boolean;
  highestUnlockedLevel: number;
  bestStarsByLevel: Record<number, number>;
  activeHintText: string | null;
  showStageModal: boolean;
  showGuideModal: boolean;
  showCoopModal: boolean;
  showDomainQrModal: boolean;
  customDomain: string;
  onStartGame: (levelId?: number) => void;
  onResumeGame: () => void;
  onPauseGame: () => void;
  onRestartLevel: () => void;
  onUndoMove: () => void;
  onRotateMirror: () => void;
  onStepDirection: (dir: Direction) => void;
  onToggleControlRole: () => void;
  onTogglePingMode: () => void;
  onTriggerHint: () => void;
  onToggleMute: () => void;
  onToggleStageModal: (show: boolean) => void;
  onToggleGuideModal: (show: boolean) => void;
  onToggleCoopModal: (show: boolean) => void;
  onToggleDomainQrModal: (show: boolean) => void;
  onSaveCustomDomain: (domain: string) => void;
  onCreateOnlineRoom: (opts: {
    playerName: string;
    roomName: string;
    isPublic: boolean;
    levelId: number;
  }) => void;
  onJoinOnlineRoom: (roomId: string, playerName: string) => void;
  onLeaveOnlineRoom: () => void;
  onCopyRoomInvite: () => void;
  onReturnTitle: () => void;
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const GameHud: React.FC<GameHudProps> = ({
  shellState,
  hud,
  muted,
  activeControlRole,
  pingModeActive,
  activeRoom,
  assignedRoomRole,
  publicRooms,
  wsConnected,
  copiedRoomCode,
  bestStarsByLevel,
  activeHintText,
  showStageModal,
  showGuideModal,
  showCoopModal,
  showDomainQrModal,
  customDomain,
  onStartGame,
  onResumeGame,
  onPauseGame,
  onRestartLevel,
  onUndoMove,
  onRotateMirror,
  onStepDirection,
  onToggleControlRole,
  onTogglePingMode,
  onTriggerHint,
  onToggleMute,
  onToggleStageModal,
  onToggleGuideModal,
  onToggleCoopModal,
  onToggleDomainQrModal,
  onSaveCustomDomain,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onLeaveOnlineRoom,
  onCopyRoomInvite,
  onReturnTitle,
}) => {
  const [stageTab, setStageTab] = useState<'solo' | 'coop'>('solo');
  const [playerName, setPlayerName] = useState<string>('Pháp Sư Cổ Tự');
  const [roomName, setRoomName] = useState<string>('Tháp Đá Hợp Lực');
  const [isPublicRoom, setIsPublicRoom] = useState<boolean>(true);
  const [selectedCoopLevel, setSelectedCoopLevel] = useState<number>(11);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');

  const soloLevels = LEVELS.filter((l) => !l.isCoop);
  const coopLevels = LEVELS.filter((l) => l.isCoop);

  const totalEarnedStars = Object.values(bestStarsByLevel).reduce(
    (acc, v) => acc + v,
    0
  );

  const handleJoinByCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = joinCodeInput.trim().toUpperCase();
    if (cleaned.length < 4) {
      setJoinError('Vui lòng nhập mã phòng hợp lệ (tối thiểu 4 ký tự).');
      return;
    }
    setJoinError('');
    onJoinOnlineRoom(cleaned, playerName.trim() || 'Pháp Sư Lam Tinh');
  };

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-10 flex flex-col justify-between">
      {/* 1. TITLE SCREEN OVERLAY */}
      {shellState === 'title' && (
        <div className="flex-1 flex flex-col justify-between p-6 md:p-12">
          <div className="my-auto max-w-md pointer-events-auto flex flex-col items-start gap-6">
            <TitleEmblemSvg />

            <p className="text-sm md:text-base text-[#cbd5e1] leading-relaxed font-sans">
              Khám phá tháp đá cổ đại ở chế độ Chơi Đơn hoặc lập phòng Hợp Tác
              Online (Co-op) cùng bạn bè: phối hợp Gương Lăng Kính, Rào Chắn và
              Cổng Nguyên Tố phân màu theo từng nhân vật.
            </p>

            {/* Primary CTA + Secondary Menu Actions (<= 3 total) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
              <button
                type="button"
                data-start="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onStartGame(hud.levelId);
                }}
                className="pixel-amber-cta px-5 py-3.5 text-base font-bold text-[#0b0e14] tracking-wide cursor-pointer whitespace-nowrap shrink-0 text-center"
              >
                Bắt Đầu Giải Đố
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleCoopModal(true);
                }}
                className="pixel-stone-button px-4 py-3.5 text-sm font-bold text-[#38bdf8] border-[#0284c7] cursor-pointer whitespace-nowrap shrink-0"
              >
                Chơi Online Co-op
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleStageModal(true);
                }}
                className="pixel-stone-button px-4 py-3.5 text-sm font-semibold text-[#f4f1ea] cursor-pointer whitespace-nowrap shrink-0"
              >
                Chọn Màn (15)
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-[#94a3b8] font-mono tabular-nums">
              <span>10 MÀN ĐƠN</span>
              <span aria-hidden="true">·</span>
              <span>5 MÀN CO-OP</span>
              <span aria-hidden="true">·</span>
              <span>SAO ĐẠT ĐƯỢC: {totalEarnedStars}/45 ★</span>
            </div>
          </div>

          {/* Single flat borderless inline control hint line in bottom safe margin */}
          <div className="text-xs text-[#94a3b8] font-mono tracking-wide">
            WASD Di Chuyển · Space Xoay Gương · Tab Đổi Nhân Vật · G Chỉ Điểm · Z Hoàn Tác · Esc Tạm Dừng
          </div>
        </div>
      )}

      {/* 2. ACTIVE PLAYING PERIMETER HUD */}
      {shellState !== 'title' && (
        <>
          {/* Top Perimeter Strip */}
          <div className="flex items-start justify-between gap-3 px-4 pt-3">
            {/* Top-Left World-Matched Status Cluster */}
            <div className="pixel-stone-panel px-3.5 py-2 pointer-events-auto flex flex-wrap xl:flex-nowrap items-center gap-3.5">
              {/* Stage Title & Code */}
              <div className="flex flex-col">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#f59e0b]">
                  {hud.level.code} · CHUẨN {hud.level.parMoves} BƯỚC
                </span>
                <span className="text-sm font-bold text-[#f4f1ea] whitespace-nowrap">
                  {hud.level.title}
                </span>
              </div>

              <div className="h-7 w-[1px] bg-[#334155]" aria-hidden="true" />

              {/* Vitality Pips (HP) */}
              <div
                className="flex flex-col gap-1"
                aria-label={`Sinh lực: ${hud.hp} trên ${hud.maxHp}`}
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8]">
                  HỘ MỆNH
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: hud.maxHp }).map((_, idx) => {
                    const state =
                      idx < hud.hp
                        ? hud.hp === 1
                          ? 'cracked'
                          : 'full'
                        : 'empty';
                    return <VitalityPipSvg key={idx} state={state} />;
                  })}
                </div>
              </div>

              {/* Moves Readout */}
              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8]">
                  SỐ BƯỚC
                </span>
                <span
                  className="text-2xl font-mono font-extrabold text-[#f4f1ea] tabular-nums leading-none"
                  style={{ paintOrder: 'stroke fill' }}
                >
                  {Math.round(hud.moves)}
                </span>
              </div>

              {/* Objectives Counter */}
              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8]">
                  ẤN CỔ & CỔNG ĐÍCH
                </span>
                <div className="flex items-center gap-2.5 font-mono text-sm font-bold tabular-nums text-[#f4f1ea]">
                  <span
                    className="flex items-center gap-1.5"
                    title="Phiến Ấn Cổ đã kích hoạt"
                  >
                    <RunePlateIconSvg
                      active={
                        hud.activatedPlates >= hud.totalPlates &&
                        hud.totalPlates > 0
                      }
                    />
                    {hud.activatedPlates}/{hud.totalPlates}
                  </span>
                  {hud.totalCrystals > 0 && (
                    <span
                      className="flex items-center gap-1.5"
                      title="Tinh Thể Ánh Sáng đã nạp"
                    >
                      <CrystalIconSvg
                        active={hud.poweredCrystals >= hud.totalCrystals}
                      />
                      {hud.poweredCrystals}/{hud.totalCrystals}
                    </span>
                  )}
                  <span className="text-xs text-[#94a3b8]">
                    · {hud.portalOpen ? 'CỔNG ĐÃ MỞ' : 'CỔNG ĐÓNG'}
                  </span>
                  {hud.isCoop && (
                    <span className="text-xs text-[#38bdf8]">
                      · P1:{hud.p1OnExit ? 'ĐÃ VÀO' : 'CHỜ'} / P2:
                      {hud.p2OnExit ? 'ĐÃ VÀO' : 'CHỜ'}
                    </span>
                  )}
                </div>
              </div>

              {/* Online Co-op Room Info Cluster if in an online session */}
              {activeRoom && (
                <>
                  <div className="h-7 w-[1px] bg-[#334155]" aria-hidden="true" />
                  <div className="flex items-center gap-2.5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#38bdf8]">
                        PHÒNG #{activeRoom.roomId} · {activeRoom.playerCount}/2
                      </span>
                      <span className="text-xs font-mono text-[#cbd5e1] tabular-nums">
                        {activeRoom.players
                          .map((p) => `${p.role}:${p.name}`)
                          .join(' · ')}
                      </span>
                    </div>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onCopyRoomInvite();
                      }}
                      className="pixel-stone-button px-2.5 py-1 text-xs font-mono font-bold text-[#fbbf24] cursor-pointer whitespace-nowrap"
                    >
                      {copiedRoomCode ? 'Đã Sao Chép!' : 'Copy Mã/Link'}
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onToggleDomainQrModal(true);
                      }}
                      className="pixel-stone-button px-2.5 py-1 text-xs font-mono font-bold text-[#38bdf8] cursor-pointer whitespace-nowrap"
                    >
                      Mã QR & Tên Miền
                    </button>
                  </div>
                </>
              )}

              {/* Elapsed Time */}
              <div className="hidden lg:flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8]">
                  THỜI GIAN
                </span>
                <span className="text-lg font-mono font-bold text-[#cbd5e1] tabular-nums leading-none">
                  {formatTime(hud.elapsedSec)}
                </span>
              </div>
            </div>

            {/* Top-Right Compact Utility Controls */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                tabIndex={-1}
                data-testid="open-domain-qr-btn"
                aria-label="Mã QR & Tên miền riêng"
                title="Chia sẻ Mã QR & Gắn tên miền riêng"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleDomainQrModal(true);
                }}
                className="pixel-stone-button px-3 h-10 flex items-center gap-1.5 text-xs font-mono font-bold text-[#fbbf24] cursor-pointer whitespace-nowrap"
              >
                <span>Mã QR & Tên Miền</span>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Sảnh chờ Online Co-op [O]"
                title="Sảnh chờ Online Co-op [O]"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleCoopModal(true);
                }}
                className="pixel-stone-button px-3 h-10 flex items-center gap-1.5 text-xs font-mono font-bold text-[#38bdf8] cursor-pointer whitespace-nowrap"
              >
                <span>Co-op Online</span>
                {activeRoom && (
                  <span className="text-[#fbbf24]">#{activeRoom.roomId}</span>
                )}
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label={muted ? 'Bật âm thanh [M]' : 'Tắt âm thanh [M]'}
                title={muted ? 'Bật âm thanh [M]' : 'Tắt âm thanh [M]'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleMute();
                }}
                className="pixel-stone-button w-10 h-10 flex items-center justify-center text-[#f4f1ea] cursor-pointer"
              >
                {muted ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Chọn màn chơi [L]"
                title="Chọn màn chơi [L]"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleStageModal(true);
                }}
                className="pixel-stone-button w-10 h-10 flex items-center justify-center text-[#f4f1ea] cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Chơi lại màn [R]"
                title="Chơi lại màn [R]"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onRestartLevel();
                }}
                className="pixel-stone-button w-10 h-10 flex items-center justify-center text-[#f4f1ea] cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Tạm dừng [P]"
                title="Tạm dừng [P]"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPauseGame();
                }}
                className="pixel-stone-button w-10 h-10 flex items-center justify-center text-[#f4f1ea] cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Bottom Unified Perimeter Dock */}
          <div className="px-4 pb-3 flex flex-col items-center gap-2">
            {activeHintText && (
              <div className="pixel-stone-panel px-4 py-2 max-w-3xl text-xs md:text-sm text-[#fef08a] font-sans pointer-events-auto flex items-center gap-3">
                <span className="font-mono font-bold text-[#38bdf8] shrink-0">
                  GỢI Ý:
                </span>
                <span>{activeHintText}</span>
              </div>
            )}

            <div className="w-full max-w-6xl flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5">
              {/* Left/Center Action Slots with Key Bindings & Effect Clues */}
              <div className="pixel-stone-panel px-2.5 py-1.5 pointer-events-auto flex flex-wrap lg:flex-nowrap items-center gap-1.5">
                {hud.isCoop && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onToggleControlRole();
                    }}
                    className={`pixel-stone-button px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                      activeControlRole === 'P1'
                        ? 'border-[#10b981]'
                        : 'border-[#38bdf8]'
                    }`}
                  >
                    <span className="font-mono text-xs font-bold text-[#fbbf24]">
                      [Tab]
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        activeControlRole === 'P1'
                          ? 'text-[#6ee7b7]'
                          : 'text-[#bae6fd]'
                      }`}
                    >
                      {activeControlRole === 'P1'
                        ? 'Nhân Vật: P1 Lục Bảo'
                        : 'Nhân Vật: P2 Lam Tinh'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onRotateMirror();
                  }}
                  className={`pixel-stone-button px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                    hud.hasAdjacentMirror ? 'border-[#38bdf8]' : 'opacity-80'
                  }`}
                >
                  <span className="font-mono text-xs font-bold text-[#fbbf24]">
                    [Space]
                  </span>
                  <span className="text-xs font-semibold text-[#f4f1ea]">
                    Xoay Gương · Đổi góc 90°
                  </span>
                </button>

                {hud.isCoop && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onTogglePingMode();
                    }}
                    className={`pixel-stone-button px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                      pingModeActive ? 'border-[#fbbf24]' : ''
                    }`}
                  >
                    <span className="font-mono text-xs font-bold text-[#38bdf8]">
                      [G]
                    </span>
                    <span className="text-xs font-semibold text-[#f4f1ea]">
                      {pingModeActive
                        ? 'Chỉ Điểm: Nhấp Ô Bản Đồ'
                        : 'Chỉ Điểm · Phát tín hiệu'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  tabIndex={-1}
                  disabled={!hud.canUndo}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onUndoMove();
                  }}
                  className="pixel-stone-button px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  <span className="font-mono text-xs font-bold text-[#fbbf24]">
                    [Z]
                  </span>
                  <span className="text-xs font-semibold text-[#f4f1ea]">
                    Hoàn Tác ({hud.moves})
                  </span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onTriggerHint();
                  }}
                  className="pixel-stone-button px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span className="font-mono text-xs font-bold text-[#38bdf8]">
                    [H]
                  </span>
                  <span className="text-xs font-semibold text-[#f4f1ea]">
                    Gợi Ý · Chỉ dẫn
                  </span>
                </button>
              </div>

              {/* Right On-Screen D-Pad */}
              <div className="pixel-stone-panel px-2.5 py-1.5 pointer-events-auto flex items-center gap-1.5">
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Di chuyển sang trái"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onStepDirection('LEFT');
                  }}
                  className="pixel-stone-button w-9 h-9 flex items-center justify-center font-mono font-bold text-sm text-[#f4f1ea] cursor-pointer"
                >
                  ←
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Di chuyển lên trên"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onStepDirection('UP');
                  }}
                  className="pixel-stone-button w-9 h-9 flex items-center justify-center font-mono font-bold text-sm text-[#f4f1ea] cursor-pointer"
                >
                  ↑
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Di chuyển xuống dưới"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onStepDirection('DOWN');
                  }}
                  className="pixel-stone-button w-9 h-9 flex items-center justify-center font-mono font-bold text-sm text-[#f4f1ea] cursor-pointer"
                >
                  ↓
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Di chuyển sang phải"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onStepDirection('RIGHT');
                  }}
                  className="pixel-stone-button w-9 h-9 flex items-center justify-center font-mono font-bold text-sm text-[#f4f1ea] cursor-pointer"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 3. PAUSE MODAL */}
      {shellState === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tạm dừng trò chơi"
          className="fixed inset-0 bg-black/75 pointer-events-auto flex items-center justify-center p-4 z-30"
        >
          <div className="pixel-stone-panel p-6 md:p-8 max-w-md w-full flex flex-col gap-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#f59e0b]">
                {hud.level.code} · TẠM DỪNG
              </span>
              <h2 className="text-2xl font-bold text-[#f4f1ea] mt-1">
                {hud.level.title}
              </h2>
              <p className="text-xs text-[#94a3b8] mt-1">
                {hud.level.mechanicHint}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-[#0f141d] border border-[#263042] p-3">
                <div className="text-[10px] font-mono text-[#94a3b8]">
                  SỐ BƯỚC
                </div>
                <div className="text-xl font-mono font-bold text-[#f4f1ea] tabular-nums mt-0.5">
                  {hud.moves} / {hud.level.parMoves}
                </div>
              </div>
              <div className="bg-[#0f141d] border border-[#263042] p-3">
                <div className="text-[10px] font-mono text-[#94a3b8]">
                  THỜI GIAN
                </div>
                <div className="text-xl font-mono font-bold text-[#f4f1ea] tabular-nums mt-0.5">
                  {formatTime(hud.elapsedSec)}
                </div>
              </div>
              <div className="bg-[#0f141d] border border-[#263042] p-3">
                <div className="text-[10px] font-mono text-[#94a3b8]">ẤN CỔ</div>
                <div className="text-xl font-mono font-bold text-[#fbbf24] tabular-nums mt-0.5">
                  {hud.activatedPlates}/{hud.totalPlates}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResumeGame}
                className="pixel-amber-cta py-3 px-4 text-sm font-bold text-[#0b0e14] cursor-pointer whitespace-nowrap"
              >
                Tiếp Tục Giải Đố
              </button>
              <button
                type="button"
                onClick={onRestartLevel}
                className="pixel-stone-button py-2.5 px-4 text-sm font-semibold text-[#f4f1ea] cursor-pointer whitespace-nowrap"
              >
                Chơi Lại Màn Này
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="pixel-stone-button py-2.5 px-4 text-sm font-semibold text-[#94a3b8] cursor-pointer whitespace-nowrap"
              >
                Về Màn Hình Chính
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. VICTORY / DEFEAT MODAL ('gameover') */}
      {shellState === 'gameover' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            hud.outcome === 'VICTORY' ? 'Hoàn thành màn chơi' : 'Thất bại'
          }
          className="fixed inset-0 bg-black/80 pointer-events-auto flex items-center justify-center p-4 z-30"
        >
          <div className="pixel-stone-panel p-6 md:p-8 max-w-md w-full flex flex-col gap-6">
            {hud.outcome === 'VICTORY' ? (
              <>
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#10b981]">
                    {hud.level.code} · GIẢI MÃ THÀNH CÔNG
                  </span>
                  <h2 className="text-2xl font-bold text-[#f4f1ea] mt-1">
                    {hud.levelId < LEVELS.length
                      ? `Đã Mở Cổng ${hud.level.title}!`
                      : 'Chinh Phục Thánh Điện Hợp Nhất!'}
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-[#0f141d] border border-[#263042] p-3">
                    <div className="text-[10px] font-mono text-[#94a3b8]">
                      BƯỚC / CHUẨN
                    </div>
                    <div className="text-xl font-mono font-bold text-[#f4f1ea] tabular-nums mt-0.5">
                      {hud.moves} / {hud.level.parMoves}
                    </div>
                  </div>
                  <div className="bg-[#0f141d] border border-[#263042] p-3">
                    <div className="text-[10px] font-mono text-[#94a3b8]">
                      THỜI GIAN
                    </div>
                    <div className="text-xl font-mono font-bold text-[#f4f1ea] tabular-nums mt-0.5">
                      {formatTime(hud.elapsedSec)}
                    </div>
                  </div>
                  <div className="bg-[#0f141d] border border-[#263042] p-3">
                    <div className="text-[10px] font-mono text-[#94a3b8]">
                      ĐÁNH GIÁ
                    </div>
                    <div className="text-xl font-mono font-bold text-[#fbbf24] tabular-nums mt-0.5">
                      {'★'.repeat(
                        calculateStars(hud.moves, hud.level.parMoves, hud.hp)
                      )}
                      {'☆'.repeat(
                        3 -
                          calculateStars(hud.moves, hud.level.parMoves, hud.hp)
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  {hud.levelId < LEVELS.length ? (
                    <button
                      type="button"
                      data-start="true"
                      onClick={() => onStartGame(hud.levelId + 1)}
                      className="pixel-amber-cta py-3 px-4 text-sm font-bold text-[#0b0e14] cursor-pointer whitespace-nowrap"
                    >
                      Màn Tiếp Theo ({LEVELS[hud.levelId]?.code || `Màn ${hud.levelId + 1}`})
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-start="true"
                      onClick={() => onStartGame(1)}
                      className="pixel-amber-cta py-3 px-4 text-sm font-bold text-[#0b0e14] cursor-pointer whitespace-nowrap"
                    >
                      Chơi Lại Từ Màn 1
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onRestartLevel}
                    className="pixel-stone-button py-2.5 px-4 text-sm font-semibold text-[#f4f1ea] cursor-pointer whitespace-nowrap"
                  >
                    Chơi Lại Để Đạt 3 Sao
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#f43f5e]">
                    {hud.level.code} · HỘ MỆNH CẠN KIỆT
                  </span>
                  <h2 className="text-2xl font-bold text-[#f4f1ea] mt-1">
                    Bị Đánh Gục Trong Đền Cổ
                  </h2>
                  <p className="text-xs text-[#fda4af] mt-1">
                    {hud.defeatReason ||
                      'Bạn đã trúng bẫy cổ đại hoặc đòn tấn công của Vệ Binh.'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-[#0f141d] border border-[#263042] p-3">
                    <div className="text-[10px] font-mono text-[#94a3b8]">
                      ẤN ĐÃ MỞ
                    </div>
                    <div className="text-xl font-mono font-bold text-[#fbbf24] tabular-nums mt-0.5">
                      {hud.activatedPlates}/{hud.totalPlates}
                    </div>
                  </div>
                  <div className="bg-[#0f141d] border border-[#263042] p-3">
                    <div className="text-[10px] font-mono text-[#94a3b8]">
                      TINH THỂ
                    </div>
                    <div className="text-xl font-mono font-bold text-[#38bdf8] tabular-nums mt-0.5">
                      {hud.poweredCrystals}/{hud.totalCrystals}
                    </div>
                  </div>
                  <div className="bg-[#0f141d] border border-[#263042] p-3">
                    <div className="text-[10px] font-mono text-[#94a3b8]">
                      SỐ BƯỚC
                    </div>
                    <div className="text-xl font-mono font-bold text-[#f4f1ea] tabular-nums mt-0.5">
                      {hud.moves}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    data-start="true"
                    onClick={onRestartLevel}
                    className="pixel-amber-cta py-3 px-4 text-sm font-bold text-[#0b0e14] cursor-pointer whitespace-nowrap"
                  >
                    Thử Lại Màn Này
                  </button>
                  {hud.canUndo && (
                    <button
                      type="button"
                      onClick={onUndoMove}
                      className="pixel-stone-button py-2.5 px-4 text-sm font-semibold text-[#f4f1ea] cursor-pointer whitespace-nowrap"
                    >
                      Hoàn Tác Bước Vừa Rồi [Z]
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 5. ONLINE CO-OP LOBBY MODAL */}
      {showCoopModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sảnh chờ Hợp tác Online Co-op"
          className="fixed inset-0 bg-black/85 pointer-events-auto flex items-center justify-center p-4 z-40"
        >
          <div className="pixel-stone-panel p-6 max-w-3xl w-full flex flex-col gap-6 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#38bdf8]">
                  HỢP TÁC THỜI GIAN THỰC ·{' '}
                  {wsConnected ? 'ĐÃ KẾT NỐI MÁY CHỦ' : 'ĐANG KẾT NỐI...'}
                </span>
                <h2 className="text-xl font-bold text-[#f4f1ea]">
                  Sảnh Chờ Online Co-op & Ghép Phòng
                </h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleDomainQrModal(true)}
                  className="pixel-stone-button px-3 py-1.5 text-xs font-mono font-bold text-[#fbbf24] border-[#d97706] cursor-pointer whitespace-nowrap"
                >
                  Mã QR & Tên Miền Riêng
                </button>
                <button
                  type="button"
                  onClick={() => onToggleCoopModal(false)}
                  className="pixel-stone-button px-3 py-1.5 text-xs font-mono font-bold text-[#cbd5e1] cursor-pointer whitespace-nowrap"
                >
                  Đóng [Esc]
                </button>
              </div>
            </div>

            {/* Active Room Status Card if currently inside a room */}
            {activeRoom && (
              <div className="bg-[#0f141d] border border-[#0284c7] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-[#38bdf8]">
                    ĐANG Ở TRONG PHÒNG #{activeRoom.roomId} (VAI TRÒ:{' '}
                    {assignedRoomRole || 'P1'})
                  </div>
                  <div className="text-base font-bold text-[#f4f1ea]">
                    {activeRoom.roomName} · {activeRoom.levelTitle}
                  </div>
                  <div className="text-xs text-[#94a3b8] font-mono">
                    Thành viên ({activeRoom.playerCount}/2):{' '}
                    {activeRoom.players
                      .map((p) => `${p.name} (${p.role})`)
                      .join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onCopyRoomInvite}
                    className="pixel-amber-cta px-3.5 py-2 text-xs font-bold text-[#0b0e14] cursor-pointer whitespace-nowrap"
                  >
                    {copiedRoomCode ? 'Đã Copy Link Mời!' : 'Copy Mã & Link Mời'}
                  </button>
                  <button
                    type="button"
                    onClick={onLeaveOnlineRoom}
                    className="pixel-stone-button px-3 py-2 text-xs font-semibold text-[#fda4af] cursor-pointer whitespace-nowrap"
                  >
                    Rời Phòng
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Create Room Form */}
              <div className="bg-[#0f141d] border border-[#263042] p-4 flex flex-col gap-4">
                <h3 className="text-base font-bold text-[#fbbf24]">
                  01. Tạo Phòng Co-op Mới
                </h3>

                <label className="flex flex-col gap-1 text-xs text-[#cbd5e1]">
                  <span>Tên Hiển Thị Của Bạn</span>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Nhập tên Pháp Sư..."
                    className="bg-[#161b26] border border-[#384358] px-3 py-2 text-sm text-[#f4f1ea] focus:outline-none focus:border-[#f59e0b]"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs text-[#cbd5e1]">
                  <span>Tên Phòng Chơi</span>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Nhập tên phòng..."
                    className="bg-[#161b26] border border-[#384358] px-3 py-2 text-sm text-[#f4f1ea] focus:outline-none focus:border-[#f59e0b]"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs text-[#cbd5e1]">
                  <span>Chọn Màn Chơi Co-op Khởi Đầu</span>
                  <select
                    value={selectedCoopLevel}
                    onChange={(e) =>
                      setSelectedCoopLevel(Number(e.target.value))
                    }
                    className="bg-[#161b26] border border-[#384358] px-3 py-2 text-sm text-[#f4f1ea] focus:outline-none focus:border-[#f59e0b]"
                  >
                    {coopLevels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.code}: {lvl.title} (Chuẩn {lvl.parMoves} bước)
                      </option>
                    ))}
                  </select>
                </label>

                {/* Segmented Privacy Control */}
                <div className="flex flex-col gap-1 text-xs text-[#cbd5e1]">
                  <span>Chế Độ Phòng</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPublicRoom(true)}
                      className={`px-3 py-2 text-xs font-bold border cursor-pointer whitespace-nowrap ${
                        isPublicRoom
                          ? 'bg-[#1e293b] border-[#38bdf8] text-[#f4f1ea]'
                          : 'bg-[#161b26] border-[#384358] text-[#94a3b8]'
                      }`}
                    >
                      Công Khai (Sảnh Chờ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPublicRoom(false)}
                      className={`px-3 py-2 text-xs font-bold border cursor-pointer whitespace-nowrap ${
                        !isPublicRoom
                          ? 'bg-[#1e293b] border-[#fbbf24] text-[#f4f1ea]'
                          : 'bg-[#161b26] border-[#384358] text-[#94a3b8]'
                      }`}
                    >
                      Riêng Tư (Mã 6 Ký Tự)
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onCreateOnlineRoom({
                      playerName: playerName.trim() || 'Pháp Sư Lục Bảo',
                      roomName: roomName.trim() || 'Tháp Đá Hợp Lực',
                      isPublic: isPublicRoom,
                      levelId: selectedCoopLevel,
                    });
                  }}
                  className="pixel-amber-cta py-3 px-4 text-sm font-bold text-[#0b0e14] cursor-pointer mt-auto whitespace-nowrap"
                >
                  Tạo Phòng & Vào Màn Co-op
                </button>
              </div>

              {/* Right Column: Join by 6-Char Code + Public Lobby List */}
              <div className="bg-[#0f141d] border border-[#263042] p-4 flex flex-col gap-4">
                <h3 className="text-base font-bold text-[#38bdf8]">
                  02. Vào Bằng Mã Phòng & Sảnh Công Khai
                </h3>

                <form
                  onSubmit={handleJoinByCodeSubmit}
                  className="flex flex-col gap-2"
                >
                  <label className="text-xs text-[#cbd5e1]">
                    Nhập Mã Phòng Riêng Tư (6 ký tự)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={8}
                      value={joinCodeInput}
                      onChange={(e) => {
                        setJoinCodeInput(e.target.value.toUpperCase());
                        if (joinError) setJoinError('');
                      }}
                      placeholder="VD: R8K2M4"
                      className="flex-1 bg-[#161b26] border border-[#384358] px-3 py-2 text-sm font-mono uppercase text-[#f4f1ea] focus:outline-none focus:border-[#38bdf8]"
                    />
                    <button
                      type="submit"
                      className="pixel-stone-button px-4 py-2 text-xs font-bold text-[#38bdf8] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Vào Phòng
                    </button>
                  </div>
                  {joinError && (
                    <span className="text-xs text-[#fda4af]">{joinError}</span>
                  )}
                </form>

                <div className="h-[1px] bg-[#263042]" aria-hidden="true" />

                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex items-center justify-between text-xs text-[#94a3b8] font-mono">
                    <span>DANH SÁCH PHÒNG CÔNG KHAI ({publicRooms.length})</span>
                    <span>THỜI GIAN THỰC</span>
                  </div>

                  {publicRooms.length === 0 ? (
                    <div className="bg-[#161b26] border border-[#263042] p-4 text-xs text-[#94a3b8] text-center my-auto">
                      Hiện chưa có phòng công khai nào đang mở. Hãy nhấn{' '}
                      <strong className="text-[#fbbf24]">
                        Tạo Phòng & Vào Màn Co-op
                      </strong>{' '}
                      ở cột bên trái để mở phòng đầu tiên!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {publicRooms.map((r) => (
                        <div
                          key={r.roomId}
                          className="bg-[#161b26] border border-[#384358] p-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-mono text-[#38bdf8] tabular-nums">
                              #{r.roomId} · {r.playerCount}/{r.maxPlayers} NGƯỜI
                              CHƠI
                            </div>
                            <div className="text-sm font-bold text-[#f4f1ea] truncate">
                              {r.roomName}
                            </div>
                            <div className="text-xs text-[#94a3b8] truncate">
                              Màn: {r.levelTitle}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onJoinOnlineRoom(
                                r.roomId,
                                playerName.trim() || 'Pháp Sư Lam Tinh'
                              )
                            }
                            className="pixel-stone-button px-3 py-1.5 text-xs font-bold text-[#fbbf24] cursor-pointer whitespace-nowrap shrink-0"
                          >
                            Tham Gia
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. STAGE SELECTOR MODAL (10 SOLO + 5 CO-OP STAGES) */}
      {showStageModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Chọn màn chơi"
          className="fixed inset-0 bg-black/80 pointer-events-auto flex items-center justify-center p-4 z-40"
        >
          <div className="pixel-stone-panel p-6 max-w-2xl w-full flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#f59e0b]">
                  BẢN ĐỒ THÁP CỔ
                </span>
                <h2 className="text-xl font-bold text-[#f4f1ea]">
                  Chọn Màn Giải Đố (15 Tầng)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onToggleStageModal(false)}
                className="pixel-stone-button px-3 py-1.5 text-xs font-mono font-bold text-[#cbd5e1] cursor-pointer"
              >
                Đóng [Esc]
              </button>
            </div>

            {/* Interactive Filter Tabs (Solo vs Co-op) */}
            <div className="flex items-center gap-2 p-1 bg-[#0f141d] border border-[#263042]">
              <button
                type="button"
                onClick={() => setStageTab('solo')}
                className={`flex-1 py-2 px-3 text-xs font-bold cursor-pointer whitespace-nowrap ${
                  stageTab === 'solo'
                    ? 'bg-[#232b3d] text-[#fbbf24]'
                    : 'text-[#94a3b8] hover:text-[#f4f1ea]'
                }`}
              >
                Chiến Dịch Đơn (10 Màn)
              </button>
              <button
                type="button"
                onClick={() => setStageTab('coop')}
                className={`flex-1 py-2 px-3 text-xs font-bold cursor-pointer whitespace-nowrap ${
                  stageTab === 'coop'
                    ? 'bg-[#232b3d] text-[#38bdf8]'
                    : 'text-[#94a3b8] hover:text-[#f4f1ea]'
                }`}
              >
                Hợp Tác Co-op (5 Màn Gương & Cổng Màu)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(stageTab === 'solo' ? soloLevels : coopLevels).map((lvl) => {
                const stars = bestStarsByLevel[lvl.id] || 0;
                const isCurrent = lvl.id === hud.levelId;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => {
                      onToggleStageModal(false);
                      onStartGame(lvl.id);
                    }}
                    className={`pixel-stone-button p-3.5 text-left flex items-center justify-between gap-3 cursor-pointer ${
                      isCurrent ? 'border-[#f59e0b]' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono text-[#94a3b8] tabular-nums">
                        {lvl.code} · CHUẨN {lvl.parMoves} BƯỚC
                      </div>
                      <div className="text-sm font-bold text-[#f4f1ea] truncate">
                        {lvl.title}
                      </div>
                      <div className="text-xs text-[#94a3b8] truncate mt-0.5">
                        {lvl.subtitle}
                      </div>
                    </div>
                    <div className="font-mono text-sm text-[#fbbf24] shrink-0 tabular-nums">
                      {'★'.repeat(stars)}
                      {'☆'.repeat(3 - stars)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 7. RULES & MECHANICS GUIDE MODAL */}
      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Hướng dẫn luật chơi"
          className="fixed inset-0 bg-black/80 pointer-events-auto flex items-center justify-center p-4 z-40"
        >
          <div className="pixel-stone-panel p-6 max-w-xl w-full flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#f59e0b]">
                  CẨM NANG CỔ ĐÀI
                </span>
                <h2 className="text-xl font-bold text-[#f4f1ea]">
                  Cơ Chế Giải Đố & Hợp Tác Co-op
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onToggleGuideModal(false)}
                className="pixel-stone-button px-3 py-1.5 text-xs font-mono font-bold text-[#cbd5e1] cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="space-y-3 text-xs md:text-sm text-[#cbd5e1] leading-relaxed">
              <p>
                <strong className="text-[#10b981]">
                  1. Phân Màu Nguyên Tố Co-op (Lục Bảo P1 & Lam Tinh P2):
                </strong>{' '}
                Pháp Sư P1 (Lục Bảo) chỉ đi qua Rào Chắn Lục và tương tác được
                với Gương/Đá Lục Bảo. Pháp Sư P2 (Lam Tinh) chỉ đi qua Rào Chắn
                Lam và tương tác với Gương/Đá Lam Tinh.
              </p>
              <p>
                <strong className="text-[#38bdf8]">
                  2. Cổng Đôi & Chuyển Vai Linh Hoạt:
                </strong>{' '}
                Ở màn Co-op, cả P1 và P2 phải cùng đứng vào đúng Cổng A và Cổng
                B để qua màn. Khi chơi 1 mình, nhấn{' '}
                <span className="font-mono text-[#f4f1ea]">[Tab]</span> để chuyển
                đổi điều khiển giữa P1 và P2.
              </p>
              <p>
                <strong className="text-[#fbbf24]">
                  3. Gương Lăng Kính & Tia Laser:
                </strong>{' '}
                Đứng cạnh Gương Lăng Kính và nhấn{' '}
                <span className="font-mono text-[#f4f1ea]">[Space]</span> để xoay
                góc gương 90°, phản chiếu tia laser vào Tinh Thể Thu hoặc tiêu
                diệt Vệ Binh.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onToggleGuideModal(false)}
              className="pixel-amber-cta py-2.5 px-4 text-sm font-bold text-[#0b0e14] cursor-pointer self-end"
            >
              Đã Hiểu
            </button>
          </div>
        </div>
      )}

      {/* 8. QR CODE & CUSTOM DOMAIN CLOUD RUN GUIDE MODAL */}
      <DomainQrModal
        isOpen={showDomainQrModal}
        customDomain={customDomain}
        activeRoomId={
          activeRoom?.roomId ||
          (typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search)
                .get('room')
                ?.trim()
                .toUpperCase() || null
            : null)
        }
        onSaveCustomDomain={onSaveCustomDomain}
        onClose={() => onToggleDomainQrModal(false)}
      />
    </div>
  );
};
