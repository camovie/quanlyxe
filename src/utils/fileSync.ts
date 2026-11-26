import {
  AccountRecord,
  CostCategory,
  DEFAULT_CATEGORIES,
  FuelLog,
  MaintenanceLog,
  Vehicle,
} from '../types';
import { normalizeAccountKey } from './auth';

export const SYNC_FILE_NAME = 'so-xe-dong-bo.json';

export interface FleetSyncData {
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  accounts: AccountRecord[];
}

export interface FleetSyncFilePayload {
  app: 'SoXe';
  version: 1;
  exportedAt: number;
  data: FleetSyncData;
}

export interface ParsedSyncFile {
  fileName: string;
  exportedAt: number | null;
  data: FleetSyncData;
}

export interface SyncFileSystemHandle {
  name: string;
  kind: 'file';
  getFile: () => Promise<File>;
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
  queryPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
}

interface PickerWindow extends Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SyncFileSystemHandle>;
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SyncFileSystemHandle[]>;
}

export function buildSyncPayload(data: FleetSyncData): FleetSyncFilePayload {
  return {
    app: 'SoXe',
    version: 1,
    exportedAt: Date.now(),
    data,
  };
}

export function serializeSyncPayload(data: FleetSyncData): string {
  return JSON.stringify(buildSyncPayload(data), null, 2);
}

function toSafeNum(val: unknown, fallback = 0): number {
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function toSafeCategories(raw: unknown): CostCategory[] {
  if (Array.isArray(raw) && raw.length > 0) {
    const cleaned = raw
      .filter((c): c is { id: unknown; name: unknown; color?: unknown } => Boolean(c && typeof c === 'object'))
      .map((c) => ({
        id: String(c.id ?? '2'),
        name: String(c.name ?? 'Bảo trì'),
        color: c.color ? String(c.color) : '#64748B',
      }));
    if (cleaned.length > 0) return cleaned;
  }
  return [...DEFAULT_CATEGORIES];
}

export function parseSyncFileText(rawText: string): {
  exportedAt: number | null;
  data: FleetSyncData;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('File không đúng định dạng JSON đồng bộ của Sổ Xe.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Nội dung file đồng bộ không hợp lệ.');
  }

  const root = parsed as Record<string, unknown>;
  const dataObj =
    root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;

  if (!Array.isArray(dataObj.vehicles) && !Array.isArray(dataObj.fuelLogs)) {
    throw new Error('File này không chứa dữ liệu xe hoặc lịch sử nhiên liệu hợp lệ.');
  }

  const vehicles: Vehicle[] = Array.isArray(dataObj.vehicles)
    ? dataObj.vehicles
        .filter((v): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && v.id && v.name))
        .map((v) => ({
          id: String(v.id),
          name: String(v.name),
          plate: String(v.plate ?? ''),
          make: String(v.make ?? ''),
          model: String(v.model ?? ''),
          year: String(v.year ?? ''),
          fuelType: String(v.fuelType ?? 'Xăng'),
          description: String(v.description ?? ''),
          source:
            v.source === 'imported' || v.source === 'sample' || v.source === 'manual'
              ? v.source
              : 'imported',
          ownerUsername: v.ownerUsername ? String(v.ownerUsername) : undefined,
          categories: toSafeCategories(v.categories),
        }))
    : [];

  const fuelLogs: FuelLog[] = Array.isArray(dataObj.fuelLogs)
    ? dataObj.fuelLogs
        .filter((l): l is Record<string, unknown> => Boolean(l && typeof l === 'object' && l.id && l.vehicleId))
        .map((l) => ({
          id: String(l.id),
          vehicleId: String(l.vehicleId),
          date: String(l.date ?? ''),
          timestamp: toSafeNum(l.timestamp),
          odo: toSafeNum(l.odo),
          litres: toSafeNum(l.litres),
          totalCost: toSafeNum(l.totalCost),
          unitPrice: toSafeNum(l.unitPrice),
          consumption:
            l.consumption !== null && l.consumption !== undefined && l.consumption !== ''
              ? toSafeNum(l.consumption)
              : null,
          full: l.full !== false && l.full !== 0 && l.full !== '0',
          notes: String(l.notes ?? ''),
        }))
        .sort((a, b) => b.timestamp - a.timestamp || b.odo - a.odo)
    : [];

  const maintenanceLogs: MaintenanceLog[] = Array.isArray(dataObj.maintenanceLogs)
    ? dataObj.maintenanceLogs
        .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object' && m.id && m.vehicleId))
        .map((m) => ({
          id: String(m.id),
          vehicleId: String(m.vehicleId),
          date: String(m.date ?? ''),
          timestamp: toSafeNum(m.timestamp),
          odo: toSafeNum(m.odo),
          title: String(m.title ?? ''),
          categoryId: String(m.categoryId ?? '2'),
          categoryName: String(m.categoryName ?? 'Bảo trì'),
          totalCost: toSafeNum(m.totalCost),
          notes: String(m.notes ?? ''),
        }))
        .sort((a, b) => b.timestamp - a.timestamp)
    : [];

  const accounts: AccountRecord[] = Array.isArray(dataObj.accounts)
    ? dataObj.accounts
        .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === 'object' && a.usernameKey))
        .map((a) => ({
          usernameKey: normalizeAccountKey(String(a.usernameKey)),
          displayUsername: String(a.displayUsername ?? a.usernameKey),
          role: a.role === 'admin' ? 'admin' : 'user',
          password: String(a.password ?? '123456'),
          createdAt: toSafeNum(a.createdAt, Date.now()),
        }))
    : [];

  const exportedAt =
    typeof root.exportedAt === 'number' && Number.isFinite(root.exportedAt)
      ? root.exportedAt
      : null;

  return {
    exportedAt,
    data: {
      vehicles,
      fuelLogs,
      maintenanceLogs,
      accounts,
    },
  };
}

/**
 * Merges local data with an incoming sync file cleanly by ID.
 * Items with new IDs from either device are preserved; matching IDs adopt the incoming file version.
 */
export function mergeSyncData(local: FleetSyncData, incoming: FleetSyncData): FleetSyncData {
  const mergeById = <T extends { id: string }>(localItems: T[], incomingItems: T[]): T[] => {
    const map = new Map<string, T>();
    for (const item of localItems) map.set(item.id, item);
    for (const item of incomingItems) map.set(item.id, item);
    return Array.from(map.values());
  };

  const vehicles = mergeById(local.vehicles, incoming.vehicles);
  const fuelLogs = mergeById(local.fuelLogs, incoming.fuelLogs).sort(
    (a, b) => b.timestamp - a.timestamp || b.odo - a.odo
  );
  const maintenanceLogs = mergeById(local.maintenanceLogs, incoming.maintenanceLogs).sort(
    (a, b) => b.timestamp - a.timestamp
  );

  const accMap = new Map<string, AccountRecord>();
  for (const a of local.accounts) accMap.set(normalizeAccountKey(a.usernameKey), a);
  for (const a of incoming.accounts) accMap.set(normalizeAccountKey(a.usernameKey), a);

  return {
    vehicles,
    fuelLogs,
    maintenanceLogs,
    accounts: Array.from(accMap.values()),
  };
}

export function downloadSyncFile(data: FleetSyncData, fileName = SYNC_FILE_NAME): void {
  const jsonText = serializeSyncPayload(data);
  const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function canShareSyncFile(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare !== 'function') return true;
  try {
    const testFile = new File(['{}'], SYNC_FILE_NAME, { type: 'application/json' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

export async function shareSyncFile(data: FleetSyncData): Promise<'shared' | 'cancelled'> {
  const jsonText = serializeSyncPayload(data);
  const file = new File([jsonText], SYNC_FILE_NAME, { type: 'application/json' });
  try {
    await navigator.share({
      title: 'Dữ liệu đồng bộ Sổ Xe',
      text: 'Lưu file này vào Google Drive, OneDrive hoặc Zalo Cloud để đồng bộ sang thiết bị khác.',
      files: [file],
    });
    return 'shared';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'cancelled';
    }
    throw err;
  }
}

export function isDirectFileSyncSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as PickerWindow;
  return typeof w.showSaveFilePicker === 'function' && typeof w.showOpenFilePicker === 'function';
}

export async function pickSaveSyncFileHandle(): Promise<SyncFileSystemHandle | null> {
  const w = window as PickerWindow;
  if (!w.showSaveFilePicker) return null;
  try {
    return await w.showSaveFilePicker({
      suggestedName: SYNC_FILE_NAME,
      types: [
        {
          description: 'File đồng bộ Sổ Xe (JSON)',
          accept: { 'application/json': ['.json'] },
        },
      ],
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return null;
    throw err;
  }
}

export async function pickOpenSyncFileHandle(): Promise<SyncFileSystemHandle | null> {
  const w = window as PickerWindow;
  if (!w.showOpenFilePicker) return null;
  try {
    const handles = await w.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: 'File đồng bộ Sổ Xe (JSON)',
          accept: { 'application/json': ['.json'] },
        },
      ],
    });
    return handles[0] ?? null;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return null;
    throw err;
  }
}

export async function ensureHandlePermission(
  handle: SyncFileSystemHandle,
  mode: 'read' | 'readwrite'
): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) return true;
  const current = await handle.queryPermission({ mode });
  if (current === 'granted') return true;
  const requested = await handle.requestPermission({ mode });
  return requested === 'granted';
}

export async function writeSyncFileToHandle(
  handle: SyncFileSystemHandle,
  data: FleetSyncData
): Promise<void> {
  const ok = await ensureHandlePermission(handle, 'readwrite');
  if (!ok) {
    throw new Error('Trình duyệt chưa được cấp quyền ghi trực tiếp vào file này.');
  }
  const writable = await handle.createWritable();
  await writable.write(serializeSyncPayload(data));
  await writable.close();
}

export async function readSyncFileFromHandle(handle: SyncFileSystemHandle): Promise<ParsedSyncFile> {
  const ok = await ensureHandlePermission(handle, 'read');
  if (!ok) {
    throw new Error('Trình duyệt chưa được cấp quyền đọc file này.');
  }
  const file = await handle.getFile();
  const text = await file.text();
  const parsed = parseSyncFileText(text);
  return {
    fileName: file.name || handle.name,
    exportedAt: parsed.exportedAt,
    data: parsed.data,
  };
}

// Persist FileSystemFileHandle in IndexedDB (standard free browser API)
const IDB_NAME = 'so_xe_file_sync_db';
const IDB_STORE = 'handles';
const IDB_KEY = 'primary_sync_file';

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB không khả dụng.'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLinkedFileHandle(handle: SyncFileSystemHandle): Promise<void> {
  try {
    const db = await openHandleDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore IDB errors silently
  }
}

export async function loadLinkedFileHandle(): Promise<SyncFileSystemHandle | null> {
  try {
    const db = await openHandleDb();
    const result = await new Promise<SyncFileSystemHandle | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve((req.result as SyncFileSystemHandle) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function clearLinkedFileHandle(): Promise<void> {
  try {
    const db = await openHandleDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore IDB errors
  }
}
