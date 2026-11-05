import { PlayerRole } from '../game/levels';

export type PreferredRoleOption = 'AUTO' | 'P1' | 'P2';

export interface PlayerProfile {
  playerId: string;
  username: string;
  pin: string;
  preferredRole: PreferredRoleOption;
  isLoggedIn: boolean;
}

export interface RoomRoleMember {
  playerId: string;
  name: string;
  role: PlayerRole;
}

/**
 * Generates a deterministic playerId when both username and a PIN are provided,
 * allowing a player to log into the same account across reconnects or devices.
 * If no PIN is set, uses the unique per-tab/per-device token so two players
 * with default names never collide.
 */
export function buildDeterministicPlayerId(
  username: string,
  pin: string,
  deviceToken: string
): string {
  const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const cleanPin = pin.trim().replace(/[^a-zA-Z0-9]/g, '');
  if (cleanUser && cleanPin.length >= 2) {
    return `acct-${cleanUser}-${cleanPin.toLowerCase()}`;
  }
  return `sess-${cleanUser || 'mage'}-${deviceToken}`;
}

/**
 * Deterministically assigns a unique character role ('P1' or 'P2') to a joining player.
 * Guarantees that two distinct playerIds in the same room NEVER receive the same role.
 */
export function assignRoomRoleForPlayer(
  existingMembers: RoomRoleMember[],
  joiningPlayerId: string,
  preferredRole: PreferredRoleOption = 'AUTO'
): { assignedRole: PlayerRole; isReconnect: boolean } {
  // 1. If this playerId is already in the room, keep their locked role
  const existing = existingMembers.find((m) => m.playerId === joiningPlayerId);
  if (existing) {
    return { assignedRole: existing.role, isReconnect: true };
  }

  // 2. Check which roles are currently occupied by OTHER players
  const otherMembers = existingMembers.filter(
    (m) => m.playerId !== joiningPlayerId
  );
  const p1Taken = otherMembers.some((m) => m.role === 'P1');
  const p2Taken = otherMembers.some((m) => m.role === 'P2');

  // 3. If one role is already taken, strictly assign the unoccupied role!
  if (p1Taken && !p2Taken) {
    return { assignedRole: 'P2', isReconnect: false };
  }
  if (p2Taken && !p1Taken) {
    return { assignedRole: 'P1', isReconnect: false };
  }

  // 4. If neither role is taken yet (first player in room), honor preferredRole
  if (preferredRole === 'P2') {
    return { assignedRole: 'P2', isReconnect: false };
  }
  return { assignedRole: 'P1', isReconnect: false };
}

const SESSION_TOKEN_KEY = 'chrono_tab_device_token';
const PROFILE_STORAGE_KEY = 'chrono_player_profile_v2';

export function getOrCreateTabDeviceToken(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    // Use sessionStorage so even two tabs on the same laptop get distinct tokens by default
    let token = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) {
      token =
        Math.random().toString(36).slice(2, 8) +
        Date.now().toString(36).slice(-4);
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
}

export function loadSavedPlayerProfile(): PlayerProfile {
  const deviceToken = getOrCreateTabDeviceToken();
  const defaultName = `Pháp Sư #${deviceToken.slice(0, 4).toUpperCase()}`;

  if (typeof window === 'undefined') {
    return {
      playerId: `sess-mage-${deviceToken}`,
      username: defaultName,
      pin: '',
      preferredRole: 'AUTO',
      isLoggedIn: false,
    };
  }

  try {
    const raw = window.sessionStorage.getItem(PROFILE_STORAGE_KEY) ||
      window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const username = String(parsed.username || defaultName).trim().slice(0, 24) || defaultName;
      const pin = String(parsed.pin || '').trim().slice(0, 12);
      const preferredRole: PreferredRoleOption =
        parsed.preferredRole === 'P1' || parsed.preferredRole === 'P2'
          ? parsed.preferredRole
          : 'AUTO';
      const playerId = buildDeterministicPlayerId(username, pin, deviceToken);
      return {
        playerId,
        username,
        pin,
        preferredRole,
        isLoggedIn: Boolean(parsed.isLoggedIn),
      };
    }
  } catch {
    // ignore storage errors
  }

  return {
    playerId: buildDeterministicPlayerId(defaultName, '', deviceToken),
    username: defaultName,
    pin: '',
    preferredRole: 'AUTO',
    isLoggedIn: false,
  };
}

export function savePlayerProfile(
  username: string,
  pin: string,
  preferredRole: PreferredRoleOption
): PlayerProfile {
  const deviceToken = getOrCreateTabDeviceToken();
  const cleanName =
    username.trim().slice(0, 24) ||
    `Pháp Sư #${deviceToken.slice(0, 4).toUpperCase()}`;
  const cleanPin = pin.trim().slice(0, 12);
  const profile: PlayerProfile = {
    playerId: buildDeterministicPlayerId(cleanName, cleanPin, deviceToken),
    username: cleanName,
    pin: cleanPin,
    preferredRole,
    isLoggedIn: true,
  };

  if (typeof window !== 'undefined') {
    try {
      const serialized = JSON.stringify(profile);
      window.sessionStorage.setItem(PROFILE_STORAGE_KEY, serialized);
      window.localStorage.setItem(PROFILE_STORAGE_KEY, serialized);
    } catch {
      // ignore storage errors
    }
  }

  return profile;
}
