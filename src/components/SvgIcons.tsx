import React from 'react';

export const TitleEmblemSvg: React.FC = () => (
  <svg
    viewBox="0 0 420 130"
    className="w-full max-w-[400px] h-auto select-none drop-shadow-[0_6px_0_#06080c]"
    role="img"
    aria-label="Cổ Đài Mật Mã — Chrono Rune"
  >
    {/* Carved Stone Crest Backing */}
    <path
      d="M12 16 H408 L416 24 V106 L408 114 H12 L4 106 V24 Z"
      fill="#161b26"
      stroke="#475569"
      strokeWidth="4"
    />
    <path
      d="M18 22 H402 V108 H18 Z"
      fill="#0f141d"
      stroke="#f59e0b"
      strokeWidth="2"
    />

    {/* Left Pixel Rune Gem */}
    <g transform="translate(28, 36)">
      <rect x="0" y="14" width="28" height="28" fill="#78350f" />
      <rect x="4" y="10" width="20" height="36" fill="#d97706" />
      <rect x="6" y="16" width="16" height="24" fill="#fbbf24" />
      <rect x="10" y="22" width="8" height="12" fill="#fef08a" />
    </g>

    {/* Right Pixel Prism Gem */}
    <g transform="translate(364, 36)">
      <rect x="0" y="14" width="28" height="28" fill="#0c4a6e" />
      <rect x="4" y="10" width="20" height="36" fill="#0284c7" />
      <rect x="6" y="16" width="16" height="24" fill="#38bdf8" />
      <rect x="10" y="22" width="8" height="12" fill="#e0f2fe" />
    </g>

    {/* Main Pixel Title Lockup */}
    <text
      x="210"
      y="62"
      textAnchor="middle"
      fill="#fbbf24"
      stroke="#451a03"
      strokeWidth="5"
      style={{
        paintOrder: 'stroke fill',
        fontFamily: "'VT323', 'JetBrains Mono', monospace",
        fontSize: '44px',
        fontWeight: 700,
        letterSpacing: '0.06em',
      }}
    >
      CỔ ĐÀI MẬT MÃ
    </text>

    {/* Subtitle Lockup */}
    <text
      x="210"
      y="94"
      textAnchor="middle"
      fill="#94a3b8"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '0.22em',
      }}
    >
      CHRONO RUNE · PIXEL PUZZLE
    </text>
  </svg>
);

export const VitalityPipSvg: React.FC<{ state: 'full' | 'cracked' | 'empty' }> = ({
  state,
}) => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" aria-hidden="true">
    {/* Dark outer silhouette */}
    <path
      d="M4 3 H20 L22 6 V13 L12 22 L2 13 V6 Z"
      fill="#090b10"
      stroke="#334155"
      strokeWidth="1.5"
    />
    {state === 'full' && (
      <>
        <path d="M5 5 H19 L20 7 V12.5 L12 19.5 L4 12.5 V7 Z" fill="#e11d48" />
        <path d="M6 6 H14 L12 10 H6 Z" fill="#fda4af" />
      </>
    )}
    {state === 'cracked' && (
      <>
        <path d="M5 5 H19 L20 7 V12.5 L12 19.5 L4 12.5 V7 Z" fill="#9f1239" />
        <path
          d="M11 5 L9 11 L14 13 L11 19"
          stroke="#090b10"
          strokeWidth="2"
          fill="none"
        />
      </>
    )}
    {state === 'empty' && (
      <path d="M6 6 H18 V12 L12 17.5 L6 12 Z" fill="#161b26" />
    )}
  </svg>
);

export const RunePlateIconSvg: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" fill="#090b10" stroke="#475569" strokeWidth="1.5" />
    <rect
      x="5"
      y="5"
      width="14"
      height="14"
      fill={active ? '#f59e0b' : '#334155'}
    />
    <rect
      x="9"
      y="9"
      width="6"
      height="6"
      fill={active ? '#fef08a' : '#64748b'}
    />
  </svg>
);

export const CrystalIconSvg: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
    <polygon
      points="12,2 21,9 17,21 7,21 3,9"
      fill="#090b10"
      stroke="#475569"
      strokeWidth="1.5"
    />
    <polygon
      points="12,5 18,10 15,19 9,19 6,10"
      fill={active ? '#f43f5e' : '#38bdf8'}
    />
    <polygon points="12,7 15,10 12,15 9,10" fill="#e0f2fe" />
  </svg>
);
