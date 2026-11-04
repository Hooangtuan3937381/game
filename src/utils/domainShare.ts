import QRCode from 'qrcode';

export interface DomainValidationResult {
  valid: boolean;
  normalized: string;
  subdomainHost: string;
  rootDomain: string;
  error?: string;
}

/**
 * Validates and normalizes a user-entered custom domain (e.g. "game.tenmiencuaban.com"
 * or "https://game.tenmiencuaban.com/").
 */
export function normalizeCustomDomain(rawInput: string): DomainValidationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      valid: false,
      normalized: '',
      subdomainHost: 'game',
      rootDomain: 'tenmiencuaban.com',
      error: 'Vui lòng nhập tên miền (ví dụ: game.tenmiencuaban.com).',
    };
  }

  const withProto = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProto);
    const hostname = parsed.hostname.toLowerCase();

    // Must contain at least one dot and valid hostname characters
    if (
      !hostname.includes('.') ||
      !/^[a-z0-9.-]+$/.test(hostname) ||
      hostname.startsWith('.') ||
      hostname.endsWith('.')
    ) {
      return {
        valid: false,
        normalized: '',
        subdomainHost: 'game',
        rootDomain: 'tenmiencuaban.com',
        error: 'Tên miền không hợp lệ. Ví dụ đúng: game.tenmiencuaban.com',
      };
    }

    const parts = hostname.split('.');
    const subdomainHost = parts.length >= 3 ? parts[0] : 'game';
    const rootDomain =
      parts.length >= 3 ? parts.slice(1).join('.') : hostname;

    return {
      valid: true,
      normalized: `${parsed.protocol}//${hostname}`,
      subdomainHost,
      rootDomain,
    };
  } catch {
    return {
      valid: false,
      normalized: '',
      subdomainHost: 'game',
      rootDomain: 'tenmiencuaban.com',
      error: 'Định dạng tên miền không hợp lệ. Ví dụ: game.tenmiencuaban.com',
    };
  }
}

/**
 * Builds the shareable game or room invite URL using the custom domain if set,
 * otherwise falling back to the current browser origin.
 */
export function buildRoomInviteUrl(
  fallbackOrigin: string,
  customDomain: string,
  roomId?: string | null
): string {
  const base = (customDomain.trim() || fallbackOrigin).replace(/\/+$/, '');
  if (!roomId) {
    return `${base}/`;
  }
  return `${base}/?room=${encodeURIComponent(roomId.trim().toUpperCase())}`;
}

export interface QrMatrix {
  size: number;
  cells: boolean[][];
}

/**
 * Synchronously generates an ISO-compliant QR Code boolean matrix for crisp SVG rendering.
 */
export function generateQrMatrix(text: string): QrMatrix {
  const qr = QRCode.create(text || 'https://localhost:3000', {
    errorCorrectionLevel: 'M',
  });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const cells: boolean[][] = [];

  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) {
      row.push(Boolean(data[y * size + x]));
    }
    cells.push(row);
  }

  return { size, cells };
}
