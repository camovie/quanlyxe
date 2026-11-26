import { AccountRecord, ThemePresetId, UiCustomization, Vehicle } from '../types';

export const ADMIN_USERNAME = 'cuong';
export const ADMIN_DEFAULT_PASSWORD = 'cuong123';
export const DEFAULT_PASSWORD = '123456';
export const DEFAULT_SPARK_PLATE = '81A02318';

export function normalizeAccountKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s\-._/]+/g, '');
}

export function formatPlateDisplay(raw: string): string {
  return raw.trim().toUpperCase();
}

export function ensureAccountsForVehicles(
  existingAccounts: AccountRecord[],
  vehicles: Vehicle[]
): AccountRecord[] {
  const map = new Map<string, AccountRecord>();

  // Always guarantee admin 'cuong' exists
  const existingAdmin = existingAccounts.find(
    (a) => normalizeAccountKey(a.usernameKey) === ADMIN_USERNAME
  );
  map.set(
    ADMIN_USERNAME,
    existingAdmin ?? {
      usernameKey: ADMIN_USERNAME,
      displayUsername: ADMIN_USERNAME,
      role: 'admin',
      password: ADMIN_DEFAULT_PASSWORD,
      createdAt: Date.now(),
    }
  );

  for (const acc of existingAccounts) {
    const key = normalizeAccountKey(acc.usernameKey);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, {
        ...acc,
        usernameKey: key,
        password:
          acc.role === 'user' && acc.password === ADMIN_DEFAULT_PASSWORD
            ? DEFAULT_PASSWORD
            : acc.password,
      });
    }
  }

  for (const v of vehicles) {
    const plate = v.plate?.trim();
    if (!plate) continue;
    const key = normalizeAccountKey(plate);
    if (!key || key === ADMIN_USERNAME) continue;
    if (!map.has(key)) {
      map.set(key, {
        usernameKey: key,
        displayUsername: formatPlateDisplay(plate),
        role: 'user',
        password: DEFAULT_PASSWORD,
        createdAt: Date.now(),
      });
    }
  }

  return Array.from(map.values());
}

export function isVehicleOwnedByAccount(vehicle: Vehicle, accountKey: string): boolean {
  const normalizedAcc = normalizeAccountKey(accountKey);
  if (normalizedAcc === ADMIN_USERNAME) return true;
  if (vehicle.ownerUsername && normalizeAccountKey(vehicle.ownerUsername) === normalizedAcc) {
    return true;
  }
  if (vehicle.plate && normalizeAccountKey(vehicle.plate) === normalizedAcc) {
    return true;
  }
  return false;
}

export interface ThemePaletteTokens {
  id: ThemePresetId;
  name: string;
  description: string;
  primaryBg: string;
  primaryHover: string;
  primaryText: string;
  badgeBg: string;
  badgeText: string;
  softBg: string;
  softBorder: string;
  swatchHex: string;
  accentHex: string;
}

export const THEME_PRESETS: Record<ThemePresetId, ThemePaletteTokens> = {
  cobalt: {
    id: 'cobalt',
    name: 'Xanh Kỹ Thuật',
    description: 'Bản vẽ kỹ thuật Cobalt kết hợp vàng hổ phách',
    primaryBg: 'bg-blue-700',
    primaryHover: 'hover:bg-blue-800',
    primaryText: 'text-blue-700',
    badgeBg: 'bg-blue-700',
    badgeText: 'text-blue-950',
    softBg: 'bg-blue-50/75',
    softBorder: 'border-blue-200',
    swatchHex: '#1D4ED8',
    accentHex: '#F59E0B',
  },
  graphite: {
    id: 'graphite',
    name: 'Xám Carbon',
    description: 'Tông xám thép tối giản, độ tương phản cao',
    primaryBg: 'bg-slate-900',
    primaryHover: 'hover:bg-slate-800',
    primaryText: 'text-slate-900',
    badgeBg: 'bg-slate-900',
    badgeText: 'text-slate-950',
    softBg: 'bg-slate-100',
    softBorder: 'border-slate-300',
    swatchHex: '#0F172A',
    accentHex: '#0F766E',
  },
  amber: {
    id: 'amber',
    name: 'Hổ Phách Xưởng',
    description: 'Tông cam xưởng dịch vụ ô tô nổi bật',
    primaryBg: 'bg-amber-600',
    primaryHover: 'hover:bg-amber-700',
    primaryText: 'text-amber-700',
    badgeBg: 'bg-amber-600',
    badgeText: 'text-amber-950',
    softBg: 'bg-amber-50/80',
    softBorder: 'border-amber-200',
    swatchHex: '#D97706',
    accentHex: '#1D4ED8',
  },
};

export const DEFAULT_CUSTOMIZATION: UiCustomization = {
  theme: 'cobalt',
  showBlueprintBanner: true,
  artworkStyle: 'dark',
};
