/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Menu, Plus, X } from 'lucide-react';
import { AccountThemeModal } from './components/AccountThemeModal';
import { AddVehicleModal } from './components/AddVehicleModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { ExpandableEntryPanel } from './components/ExpandableEntryPanel';
import { FileSyncModal } from './components/FileSyncModal';
import { KpiStrip } from './components/KpiStrip';
import { LedgerTables } from './components/LedgerTables';
import { LoginScreen } from './components/LoginScreen';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PostLoginSetup } from './components/PostLoginSetup';
import { ReportCharts } from './components/ReportCharts';
import { ReportToolbar } from './components/ReportToolbar';
import { Sidebar } from './components/Sidebar';
import { VehicleOdoCluster } from './components/VehicleOdoCluster';
import { createSecondarySampleVehicles } from './data/sampleVehicles';
import {
  AccountRecord,
  EntryFormTab,
  FuelLog,
  MaintenanceLog,
  ReportScope,
  SessionUser,
  TimeFilter,
  UiCustomization,
  Vehicle,
} from './types';
import { computeVehicleAnalytics, getPeriodBounds, isTimestampInBounds } from './utils/analytics';
import {
  ADMIN_USERNAME,
  DEFAULT_CUSTOMIZATION,
  DEFAULT_PASSWORD,
  DEFAULT_SPARK_PLATE,
  ensureAccountsForVehicles,
  formatPlateDisplay,
  isVehicleOwnedByAccount,
  normalizeAccountKey,
  THEME_PRESETS,
} from './utils/auth';
import { extractDateOnly } from './utils/format';
import {
  exportFuelioCsv,
  parseFuelioCsv,
  recalculateVehicleFuelLogs,
} from './utils/fuelioCsv';
import {
  clearLinkedFileHandle,
  FleetSyncData,
  loadLinkedFileHandle,
  saveLinkedFileHandle,
  SyncFileSystemHandle,
  writeSyncFileToHandle,
} from './utils/fileSync';

const STORAGE_KEY = 'so_xe_fleet_ledger_v1';
const ACCOUNTS_STORAGE_KEY = 'so_xe_accounts_v1';
const SESSION_STORAGE_KEY = 'so_xe_session_v1';
const CUSTOMIZATION_STORAGE_KEY = 'so_xe_ui_custom_v1';
const FILE_SYNC_AT_STORAGE_KEY = 'so_xe_file_sync_last_at_v1';
const AUTO_WRITE_FILE_STORAGE_KEY = 'so_xe_auto_write_file_v1';
const ATTACHED_CSV_URL = `${import.meta.env.BASE_URL}assets/aistudio/car2-20260824-083541_5714fd97.csv`;

interface PersistedState {
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  selectedVehicleId: string;
}

function readStoredAccounts(): AccountRecord[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as AccountRecord[];
    }
  } catch {
    // Ignore storage error
  }
  return [];
}

function readStoredSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SessionUser;
      if (parsed && parsed.usernameKey && parsed.role) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage error
  }
  return null;
}

function readStoredCustomization(): UiCustomization {
  try {
    const raw = localStorage.getItem(CUSTOMIZATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UiCustomization>;
      return {
        theme: parsed.theme && THEME_PRESETS[parsed.theme] ? parsed.theme : 'cobalt',
        showBlueprintBanner:
          typeof parsed.showBlueprintBanner === 'boolean' ? parsed.showBlueprintBanner : true,
        artworkStyle: parsed.artworkStyle === 'blue' ? 'blue' : 'dark',
      };
    }
  } catch {
    // Ignore storage error
  }
  return DEFAULT_CUSTOMIZATION;
}

function enrichDefaultSparkPlate(list: Vehicle[]): Vehicle[] {
  return list.map((v) => {
    const isSpark = v.id === 'veh_spark_08' || v.name.toLowerCase().includes('spark');
    if (isSpark && (!v.plate || !v.plate.trim() || v.plate.trim() === '51F-008.08')) {
      return { ...v, plate: DEFAULT_SPARK_PLATE };
    }
    return v;
  });
}

export default function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Authentication & UI customization state
  const [accounts, setAccounts] = useState<AccountRecord[]>(() =>
    ensureAccountsForVehicles(readStoredAccounts(), [])
  );
  const [session, setSession] = useState<SessionUser | null>(() => readStoredSession());
  const [customization, setCustomization] = useState<UiCustomization>(() =>
    readStoredCustomization()
  );

  // Report controls
  const [reportScope, setReportScope] = useState<ReportScope>('overview');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>({
    mode: 'year',
    year: 2026,
    month: 8,
    startDate: '2026-01-01',
    endDate: '2026-08-31',
  });

  // Expandable entry form state
  const [entryExpanded, setEntryExpanded] = useState(false);
  const [entryTab, setEntryTab] = useState<EntryFormTab>('fuel');
  const [editingFuel, setEditingFuel] = useState<FuelLog | null>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceLog | null>(null);

  // Modals & mobile drawer
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [androidModalOpen, setAndroidModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Free portable cross-device file sync metadata
  const [linkedFileHandle, setLinkedFileHandle] = useState<SyncFileSystemHandle | null>(null);
  const [autoWriteLinkedFile, setAutoWriteLinkedFile] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTO_WRITE_FILE_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(FILE_SYNC_AT_STORAGE_KEY);
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  });
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);

  const bannerCsvInputRef = useRef<HTMLInputElement | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  // Initial data bootstrap: localStorage or parse attached Fuelio CSV + secondary vehicles
  useEffect(() => {
    let cancelled = false;

    async function initData() {
      const storedAccounts = readStoredAccounts();

      try {
        const cachedRaw = localStorage.getItem(STORAGE_KEY);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw) as PersistedState;
          if (Array.isArray(parsed.vehicles) && parsed.vehicles.length > 0) {
            const enrichedVehicles = enrichDefaultSparkPlate(parsed.vehicles);
            const syncedAccounts = ensureAccountsForVehicles(storedAccounts, enrichedVehicles);
            if (!cancelled) {
              setVehicles(enrichedVehicles);
              setFuelLogs(parsed.fuelLogs ?? []);
              setMaintenanceLogs(parsed.maintenanceLogs ?? []);
              setAccounts(syncedAccounts);
              const validSelected =
                parsed.selectedVehicleId === 'all' ||
                enrichedVehicles.some((v) => v.id === parsed.selectedVehicleId)
                  ? parsed.selectedVehicleId
                  : enrichedVehicles[0].id;
              setSelectedVehicleId(validSelected);
              setLoading(false);
            }
            return;
          }
        }
      } catch {
        // Fallback to CSV fetch if localStorage is unavailable or corrupt
      }

      try {
        const res = await fetch(ATTACHED_CSV_URL);
        if (!res.ok) {
          throw new Error(`Không thể tải tệp dữ liệu gốc (HTTP ${res.status})`);
        }
        const csvText = await res.text();
        const primaryBundle = parseFuelioCsv(csvText, { source: 'imported' });
        const primaryVehicle: Vehicle = {
          ...primaryBundle.vehicle,
          plate: primaryBundle.vehicle.plate || DEFAULT_SPARK_PLATE,
        };
        const secondary = createSecondarySampleVehicles();

        const initialVehicles = [primaryVehicle, ...secondary.vehicles];
        const initialFuel = [...primaryBundle.fuelLogs, ...secondary.fuelLogs];
        const initialMaint = [...primaryBundle.maintenanceLogs, ...secondary.maintenanceLogs];
        const syncedAccounts = ensureAccountsForVehicles(storedAccounts, initialVehicles);

        if (!cancelled) {
          setVehicles(initialVehicles);
          setFuelLogs(initialFuel);
          setMaintenanceLogs(initialMaint);
          setAccounts(syncedAccounts);
          setSelectedVehicleId(primaryVehicle.id);

          // Set default year/month based on the latest entry of the primary imported vehicle
          const latestTs = primaryBundle.fuelLogs[0]?.timestamp;
          if (latestTs) {
            const d = new Date(latestTs);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            setTimeFilter({
              mode: 'year',
              year: y,
              month: m,
              startDate: `${y}-01-01`,
              endDate: `${y}-${String(m).padStart(2, '0')}-${String(
                new Date(y, m, 0).getDate()
              ).padStart(2, '0')}`,
            });
          }

          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Lỗi đọc dữ liệu ban đầu.');
          const secondary = createSecondarySampleVehicles();
          const syncedAccounts = ensureAccountsForVehicles(storedAccounts, secondary.vehicles);
          setVehicles(secondary.vehicles);
          setFuelLogs(secondary.fuelLogs);
          setMaintenanceLogs(secondary.maintenanceLogs);
          setAccounts(syncedAccounts);
          setSelectedVehicleId(secondary.vehicles[0]?.id ?? 'all');
          setLoading(false);
        }
      }
    }

    initData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep accounts synchronized with any newly added vehicle plates
  useEffect(() => {
    if (loading) return;
    setAccounts((prev) => ensureAccountsForVehicles(prev, vehicles));
  }, [vehicles, loading]);

  // Persist fleet ledger to localStorage
  useEffect(() => {
    if (loading || vehicles.length === 0) return;
    try {
      const state: PersistedState = {
        vehicles,
        fuelLogs,
        maintenanceLogs,
        selectedVehicleId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [vehicles, fuelLogs, maintenanceLogs, selectedVehicleId, loading]);

  // Persist accounts, session, and UI customization
  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch {
      // Ignore
    }
  }, [accounts]);

  useEffect(() => {
    try {
      if (session) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }, [session]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, JSON.stringify(customization));
    } catch {
      // Ignore
    }
  }, [customization]);

  // Restore previously linked desktop Drive/OneDrive sync file handle from IndexedDB
  useEffect(() => {
    let active = true;
    loadLinkedFileHandle().then((handle) => {
      if (active && handle) {
        setLinkedFileHandle(handle);
      }
    });
    return () => {
      active = false;
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const showNotice = (msg: string) => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    setNotice(msg);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 1000);
  };

  const handleSetLinkedHandle = (handle: SyncFileSystemHandle | null) => {
    setLinkedFileHandle(handle);
    if (handle) {
      void saveLinkedFileHandle(handle);
    } else {
      void clearLinkedFileHandle();
    }
  };

  const handleToggleAutoWrite = (enabled: boolean) => {
    setAutoWriteLinkedFile(enabled);
    try {
      localStorage.setItem(AUTO_WRITE_FILE_STORAGE_KEY, String(enabled));
    } catch {
      // Ignore storage error
    }
  };

  const handleMarkSynced = () => {
    const now = Date.now();
    setLastSyncAt(now);
    setHasUnsyncedChanges(false);
    try {
      localStorage.setItem(FILE_SYNC_AT_STORAGE_KEY, String(now));
    } catch {
      // Ignore storage error
    }
  };

  // Optional auto-write to linked Drive/OneDrive file when permission is already granted
  useEffect(() => {
    if (loading || !linkedFileHandle || !autoWriteLinkedFile || !hasUnsyncedChanges) return;
    let cancelled = false;

    async function autoSyncToLinked() {
      if (!linkedFileHandle) return;
      try {
        if (linkedFileHandle.queryPermission) {
          const perm = await linkedFileHandle.queryPermission({ mode: 'readwrite' });
          if (perm !== 'granted') return;
        }
        await writeSyncFileToHandle(linkedFileHandle, {
          vehicles,
          fuelLogs,
          maintenanceLogs,
          accounts,
        });
        if (!cancelled) {
          handleMarkSynced();
        }
      } catch {
        // User can re-authorize manually inside FileSyncModal if browser revoked permission
      }
    }

    void autoSyncToLinked();
    return () => {
      cancelled = true;
    };
  }, [
    loading,
    linkedFileHandle,
    autoWriteLinkedFile,
    hasUnsyncedChanges,
    vehicles,
    fuelLogs,
    maintenanceLogs,
    accounts,
  ]);

  const handleApplySyncedData = (payload: FleetSyncData, modeLabel: string) => {
    const nextVehicles = enrichDefaultSparkPlate(payload.vehicles);
    const nextAccounts = ensureAccountsForVehicles(payload.accounts, nextVehicles);
    setVehicles(nextVehicles);
    setFuelLogs(payload.fuelLogs);
    setMaintenanceLogs(payload.maintenanceLogs);
    setAccounts(nextAccounts);

    if (nextVehicles.length > 0) {
      const stillValid =
        selectedVehicleId === 'all' || nextVehicles.some((v) => v.id === selectedVehicleId);
      if (!stillValid) {
        if (session?.role === 'user') {
          const owned = nextVehicles.filter((v) =>
            isVehicleOwnedByAccount(v, session.usernameKey)
          );
          setSelectedVehicleId(owned[0]?.id ?? '');
        } else {
          setSelectedVehicleId(nextVehicles[0].id);
        }
      }
    }
    showNotice(modeLabel);
  };

  // Visible vehicles filtered by logged-in user role
  const visibleVehicles = useMemo(() => {
    if (!session) return [];
    if (session.role === 'admin') return vehicles;
    return vehicles.filter((v) => isVehicleOwnedByAccount(v, session.usernameKey));
  }, [vehicles, session]);

  const effectiveSelectedVehicleId = useMemo(() => {
    if (!session || visibleVehicles.length === 0) return '';
    if (
      selectedVehicleId === 'all' &&
      (session.role === 'admin' || visibleVehicles.length > 1)
    ) {
      return 'all';
    }
    if (visibleVehicles.some((v) => v.id === selectedVehicleId)) {
      return selectedVehicleId;
    }
    return visibleVehicles[0].id;
  }, [session, visibleVehicles, selectedVehicleId]);

  // Lookup maps
  const vehiclesById = useMemo(() => {
    const map: Record<string, Vehicle> = {};
    for (const v of vehicles) map[v.id] = v;
    return map;
  }, [vehicles]);

  const latestOdoByVehicle = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of fuelLogs) {
      map[l.vehicleId] = Math.max(map[l.vehicleId] ?? 0, l.odo);
    }
    for (const m of maintenanceLogs) {
      map[m.vehicleId] = Math.max(map[m.vehicleId] ?? 0, m.odo);
    }
    return map;
  }, [fuelLogs, maintenanceLogs]);

  const latestUnitPriceByVehicle = useMemo(() => {
    const map: Record<string, number> = {};
    const sorted = [...fuelLogs].sort((a, b) => b.timestamp - a.timestamp);
    for (const l of sorted) {
      if (!map[l.vehicleId] && l.unitPrice > 0) {
        map[l.vehicleId] = l.unitPrice;
      }
    }
    return map;
  }, [fuelLogs]);

  const countsByVehicle = useMemo(() => {
    const map: Record<string, { fuel: number; maintenance: number }> = {};
    for (const v of visibleVehicles) map[v.id] = { fuel: 0, maintenance: 0 };
    for (const l of fuelLogs) {
      if (map[l.vehicleId]) map[l.vehicleId].fuel += 1;
    }
    for (const m of maintenanceLogs) {
      if (map[m.vehicleId]) map[m.vehicleId].maintenance += 1;
    }
    return map;
  }, [visibleVehicles, fuelLogs, maintenanceLogs]);

  // Scoped logs for selected vehicle (or all visible vehicles)
  const visibleVehicleIds = useMemo(
    () => new Set(visibleVehicles.map((v) => v.id)),
    [visibleVehicles]
  );

  const scopedFuelLogs = useMemo(() => {
    if (!effectiveSelectedVehicleId) return [];
    if (effectiveSelectedVehicleId === 'all') {
      return fuelLogs.filter((l) => visibleVehicleIds.has(l.vehicleId));
    }
    return fuelLogs.filter((l) => l.vehicleId === effectiveSelectedVehicleId);
  }, [fuelLogs, effectiveSelectedVehicleId, visibleVehicleIds]);

  const scopedMaintenanceLogs = useMemo(() => {
    if (!effectiveSelectedVehicleId) return [];
    if (effectiveSelectedVehicleId === 'all') {
      return maintenanceLogs.filter((m) => visibleVehicleIds.has(m.vehicleId));
    }
    return maintenanceLogs.filter((m) => m.vehicleId === effectiveSelectedVehicleId);
  }, [maintenanceLogs, effectiveSelectedVehicleId, visibleVehicleIds]);

  const recentMaintenanceTitles = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const m of scopedMaintenanceLogs) {
      const t = m.title.trim();
      if (t && !seen.has(t.toLowerCase())) {
        seen.add(t.toLowerCase());
        list.push(t);
      }
      if (list.length >= 6) break;
    }
    return list;
  }, [scopedMaintenanceLogs]);

  // Latest fuel log & ODO for main dashboard cluster
  const { latestFuelLog, previousFuelLog, latestFuelVehicle, clusterLatestOdo } = useMemo(() => {
    const sorted = [...scopedFuelLogs].sort(
      (a, b) => b.timestamp - a.timestamp || b.odo - a.odo
    );
    const newest = sorted[0] ?? null;
    const prevSameVehicle = newest
      ? sorted.find((l, idx) => idx > 0 && l.vehicleId === newest.vehicleId) ?? null
      : null;
    const fuelVeh = newest ? vehiclesById[newest.vehicleId] ?? null : null;
    const maxOdo =
      effectiveSelectedVehicleId && effectiveSelectedVehicleId !== 'all'
        ? latestOdoByVehicle[effectiveSelectedVehicleId] ?? 0
        : visibleVehicles.reduce(
            (max, v) => Math.max(max, latestOdoByVehicle[v.id] ?? 0),
            0
          );
    return {
      latestFuelLog: newest,
      previousFuelLog: prevSameVehicle,
      latestFuelVehicle: fuelVeh,
      clusterLatestOdo: maxOdo,
    };
  }, [
    scopedFuelLogs,
    vehiclesById,
    effectiveSelectedVehicleId,
    latestOdoByVehicle,
    visibleVehicles,
  ]);

  // Report analytics for selected vehicle + period
  const analytics = useMemo(
    () => computeVehicleAnalytics(scopedFuelLogs, scopedMaintenanceLogs, timeFilter),
    [scopedFuelLogs, scopedMaintenanceLogs, timeFilter]
  );

  // Auth handlers
  const handleLogin = (usernameInput: string, passwordInput: string): string | null => {
    const key = normalizeAccountKey(usernameInput);
    if (!key) {
      return 'Vui lòng nhập biển số xe hoặc tên tài khoản quản trị.';
    }
    if (!passwordInput) {
      return 'Vui lòng nhập mật khẩu.';
    }

    const existing = accounts.find((a) => normalizeAccountKey(a.usernameKey) === key);
    let loggedUser: SessionUser;

    if (existing) {
      if (existing.password !== passwordInput) {
        return 'Mật khẩu không chính xác.';
      }
      loggedUser = {
        usernameKey: existing.usernameKey,
        displayUsername: existing.displayUsername,
        role: existing.role,
      };
    } else {
      if (passwordInput !== DEFAULT_PASSWORD) {
        return `Biển số mới chưa có mật khẩu riêng; vui lòng dùng mật khẩu mặc định "123456".`;
      }
      const newAcc: AccountRecord = {
        usernameKey: key,
        displayUsername: formatPlateDisplay(usernameInput),
        role: 'user',
        password: DEFAULT_PASSWORD,
        createdAt: Date.now(),
      };
      setAccounts((prev) => [...prev, newAcc]);
      setHasUnsyncedChanges(true);
      loggedUser = {
        usernameKey: newAcc.usernameKey,
        displayUsername: newAcc.displayUsername,
        role: 'user',
      };
    }

    setSession(loggedUser);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(loggedUser));
    } catch {
      // Ignore storage error
    }
    setEntryExpanded(false);

    if (loggedUser.role === 'admin') {
      setSelectedVehicleId(vehicles[0]?.id ?? 'all');
    } else {
      const owned = vehicles.filter((v) => isVehicleOwnedByAccount(v, loggedUser.usernameKey));
      setSelectedVehicleId(owned[0]?.id ?? '');
    }

    return null;
  };

  const handleLogout = () => {
    setSession(null);
    setEntryExpanded(false);
    setAccountModalOpen(false);
    setMobileMenuOpen(false);
  };

  const handleChangePassword = (currentPwd: string, newPwd: string): string | null => {
    if (!session) return 'Phiên đăng nhập không hợp lệ.';
    const currentAcc = accounts.find(
      (a) => normalizeAccountKey(a.usernameKey) === normalizeAccountKey(session.usernameKey)
    );
    if (!currentAcc) return 'Không tìm thấy tài khoản.';
    if (currentAcc.password !== currentPwd) {
      return 'Mật khẩu hiện tại không đúng.';
    }
    setAccounts((prev) =>
      prev.map((a) =>
        normalizeAccountKey(a.usernameKey) === currentAcc.usernameKey
          ? { ...a, password: newPwd }
          : a
      )
    );
    setHasUnsyncedChanges(true);
    return null;
  };

  const handleResetAccountPassword = (usernameKey: string) => {
    const targetKey = normalizeAccountKey(usernameKey);
    setAccounts((prev) =>
      prev.map((a) =>
        normalizeAccountKey(a.usernameKey) === targetKey
          ? { ...a, password: DEFAULT_PASSWORD }
          : a
      )
    );
    setHasUnsyncedChanges(true);
    showNotice(`Đã đặt lại mật khẩu tài khoản về ${DEFAULT_PASSWORD}.`);
  };

  const handleCreatePlateAccount = (plate: string): string | null => {
    const key = normalizeAccountKey(plate);
    if (!key) return 'Vui lòng nhập biển số xe.';
    if (key === ADMIN_USERNAME) return 'Không thể dùng tên tài khoản quản trị.';
    if (accounts.some((a) => normalizeAccountKey(a.usernameKey) === key)) {
      return 'Tài khoản biển số này đã tồn tại.';
    }
    const newAcc: AccountRecord = {
      usernameKey: key,
      displayUsername: formatPlateDisplay(plate),
      role: 'user',
      password: DEFAULT_PASSWORD,
      createdAt: Date.now(),
    };
    setAccounts((prev) => [...prev, newAcc]);
    setHasUnsyncedChanges(true);
    return null;
  };

  // Ensure a newly logged entry is visible in the current filter window
  const ensureDateVisible = (timestamp: number, dateStr: string) => {
    const bounds = getPeriodBounds(timeFilter);
    if (isTimestampInBounds(timestamp, bounds)) return;
    const d = new Date(timestamp);
    if (timeFilter.mode === 'month') {
      setTimeFilter({
        ...timeFilter,
        year: d.getFullYear(),
        month: d.getMonth() + 1,
      });
    } else if (timeFilter.mode === 'year') {
      setTimeFilter({
        ...timeFilter,
        year: d.getFullYear(),
      });
    } else if (timeFilter.mode === 'custom') {
      const iso = extractDateOnly(dateStr);
      const nextStart =
        !timeFilter.startDate || iso < timeFilter.startDate ? iso : timeFilter.startDate;
      const nextEnd =
        !timeFilter.endDate || iso > timeFilter.endDate ? iso : timeFilter.endDate;
      setTimeFilter({
        ...timeFilter,
        startDate: nextStart,
        endDate: nextEnd,
      });
    }
  };

  // Handlers: Fuel CRUD
  const handleSaveFuel = (log: FuelLog, isEdit: boolean) => {
    setFuelLogs((prev) => {
      const otherVehicles = prev.filter((item) => item.vehicleId !== log.vehicleId);
      const sameVehicle = prev.filter((item) => item.vehicleId === log.vehicleId);
      const nextSameVehicle = isEdit
        ? sameVehicle.map((item) => (item.id === log.id ? log : item))
        : [log, ...sameVehicle];
      const recalculated = recalculateVehicleFuelLogs(nextSameVehicle);
      return [...otherVehicles, ...recalculated].sort(
        (a, b) => b.timestamp - a.timestamp || b.odo - a.odo
      );
    });

    if (effectiveSelectedVehicleId !== 'all' && effectiveSelectedVehicleId !== log.vehicleId) {
      setSelectedVehicleId(log.vehicleId);
    }
    ensureDateVisible(log.timestamp, log.date);
    setHasUnsyncedChanges(true);
    showNotice(isEdit ? 'Đã cập nhật lần đổ nhiên liệu.' : 'Đã hoàn thành ghi nhận đổ nhiên liệu.');
  };

  const handleDeleteFuel = (id: string) => {
    setFuelLogs((prev) => {
      const target = prev.find((l) => l.id === id);
      if (!target) return prev;
      const otherVehicles = prev.filter((l) => l.vehicleId !== target.vehicleId);
      const remainingSame = prev.filter(
        (l) => l.vehicleId === target.vehicleId && l.id !== id
      );
      return [...otherVehicles, ...recalculateVehicleFuelLogs(remainingSame)].sort(
        (a, b) => b.timestamp - a.timestamp || b.odo - a.odo
      );
    });
    if (editingFuel?.id === id) setEditingFuel(null);
    setHasUnsyncedChanges(true);
    showNotice('Đã xóa bản ghi đổ nhiên liệu.');
  };

  // Handlers: Maintenance CRUD
  const handleSaveMaintenance = (log: MaintenanceLog, isEdit: boolean) => {
    setMaintenanceLogs((prev) => {
      const next = isEdit
        ? prev.map((item) => (item.id === log.id ? log : item))
        : [log, ...prev];
      return next.sort((a, b) => b.timestamp - a.timestamp);
    });

    if (effectiveSelectedVehicleId !== 'all' && effectiveSelectedVehicleId !== log.vehicleId) {
      setSelectedVehicleId(log.vehicleId);
    }
    ensureDateVisible(log.timestamp, log.date);
    setHasUnsyncedChanges(true);
    showNotice(
      isEdit ? 'Đã cập nhật hạng mục bảo dưỡng.' : 'Đã hoàn thành ghi nhận bảo dưỡng / sửa chữa.'
    );
  };

  const handleDeleteMaintenance = (id: string) => {
    setMaintenanceLogs((prev) => prev.filter((m) => m.id !== id));
    if (editingMaintenance?.id === id) setEditingMaintenance(null);
    setHasUnsyncedChanges(true);
    showNotice('Đã xóa hạng mục bảo dưỡng / sửa chữa.');
  };

  // Handlers: Vehicles CRUD
  const handleSaveVehicle = (vehicle: Vehicle) => {
    const ownedVehicle: Vehicle =
      !editingVehicle && session?.role === 'user'
        ? {
            ...vehicle,
            ownerUsername: vehicle.ownerUsername ?? session.usernameKey,
            plate: vehicle.plate.trim() || session.displayUsername,
          }
        : vehicle;

    setVehicles((prev) => {
      const exists = prev.some((v) => v.id === ownedVehicle.id);
      if (exists) {
        return prev.map((v) => (v.id === ownedVehicle.id ? ownedVehicle : v));
      }
      return [...prev, ownedVehicle];
    });
    setSelectedVehicleId(ownedVehicle.id);
    setHasUnsyncedChanges(true);
    showNotice(
      editingVehicle
        ? `Đã cập nhật thông tin xe "${ownedVehicle.name}".`
        : `Đã thêm xe mới "${ownedVehicle.name}".`
    );
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    const target = vehicles.find((v) => v.id === vehicleId);
    setVehicles((prev) => {
      const remaining = prev.filter((v) => v.id !== vehicleId);
      if (selectedVehicleId === vehicleId) {
        const remainingVisible =
          session?.role === 'admin'
            ? remaining
            : remaining.filter((v) =>
                session ? isVehicleOwnedByAccount(v, session.usernameKey) : false
              );
        setSelectedVehicleId(remainingVisible[0]?.id ?? '');
      }
      return remaining;
    });
    setFuelLogs((prev) => prev.filter((l) => l.vehicleId !== vehicleId));
    setMaintenanceLogs((prev) => prev.filter((m) => m.vehicleId !== vehicleId));
    setHasUnsyncedChanges(true);
    if (target) showNotice(`Đã xóa xe "${target.name}" và dữ liệu liên quan.`);
  };

  // Handlers: CSV Import / Export
  const handleImportCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const bundle = parseFuelioCsv(text, { source: 'imported' });

        // Avoid duplicate vehicle ID collisions
        const existingId = vehicles.some((v) => v.id === bundle.vehicle.id);
        const baseVehicle: Vehicle = existingId
          ? {
              ...bundle.vehicle,
              id: `${bundle.vehicle.id}_${Date.now()}`,
              name: `${bundle.vehicle.name} (Nhập mới)`,
            }
          : bundle.vehicle;

        const finalVehicle: Vehicle =
          session?.role === 'user'
            ? {
                ...baseVehicle,
                ownerUsername: session.usernameKey,
                plate: baseVehicle.plate.trim() || session.displayUsername,
              }
            : baseVehicle;

        const finalFuel = bundle.fuelLogs.map((l) => ({
          ...l,
          vehicleId: finalVehicle.id,
        }));
        const finalMaint = bundle.maintenanceLogs.map((m) => ({
          ...m,
          vehicleId: finalVehicle.id,
        }));

        setVehicles((prev) => [...prev, finalVehicle]);
        setFuelLogs((prev) =>
          [...prev, ...finalFuel].sort((a, b) => b.timestamp - a.timestamp || b.odo - a.odo)
        );
        setMaintenanceLogs((prev) =>
          [...prev, ...finalMaint].sort((a, b) => b.timestamp - a.timestamp)
        );
        setSelectedVehicleId(finalVehicle.id);
        setHasUnsyncedChanges(true);
        showNotice(
          `Đã nhập xe "${finalVehicle.name}" (${finalFuel.length} lần xăng, ${finalMaint.length} hạng mục bảo dưỡng).`
        );
      } catch {
        showNotice('Không thể đọc tệp CSV. Vui lòng kiểm tra định dạng Fuelio CSV.');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleExportCsv = () => {
    const vehicle = visibleVehicles.find((v) => v.id === effectiveSelectedVehicleId);
    if (!vehicle) return;
    const vFuel = fuelLogs.filter((l) => l.vehicleId === vehicle.id);
    const vMaint = maintenanceLogs.filter((m) => m.vehicleId === vehicle.id);
    const csv = exportFuelioCsv(vehicle, vFuel, vMaint);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = vehicle.name.replace(/[^\p{L}\p{N}_-]+/gu, '_');
    a.href = url;
    a.download = `${safeName}_bao_cao_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotice(`Đã xuất tệp CSV cho xe "${vehicle.name}".`);
  };

  const openEntryPanel = (tab: EntryFormTab) => {
    setEditingFuel(null);
    setEditingMaintenance(null);
    setEntryTab(tab);
    setEntryExpanded(true);
  };

  const handleEditFuel = (log: FuelLog) => {
    setEditingMaintenance(null);
    setEditingFuel(log);
    setEntryTab('fuel');
    setEntryExpanded(true);
  };

  const handleEditMaintenance = (log: MaintenanceLog) => {
    setEditingFuel(null);
    setEditingMaintenance(log);
    setEntryTab('maintenance');
    setEntryExpanded(true);
  };

  const palette = THEME_PRESETS[customization.theme];

  // Show loading skeleton before session/data check finishes
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="h-14 animate-pulse rounded-lg border border-slate-200 bg-white" />
          <div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  // Show Login Gate if user has not authenticated
  if (!session) {
    return (
      <>
        <LoginScreen
          accounts={accounts}
          vehicles={vehicles}
          customization={customization}
          onLogin={handleLogin}
        />
        <OfflineIndicator />
      </>
    );
  }

  const selectedVehicle =
    effectiveSelectedVehicleId && effectiveSelectedVehicleId !== 'all'
      ? visibleVehicles.find((v) => v.id === effectiveSelectedVehicleId) ?? null
      : null;

  const scopeTitleMap: Record<ReportScope, string> = {
    overview: 'Tổng quan báo cáo',
    fuel: 'Báo cáo nhiên liệu',
    maintenance: 'Bảo dưỡng & Sửa chữa',
  };

  const openCreateVehicleModal = () => {
    setEditingVehicle(null);
    setVehicleModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <input
        ref={bannerCsvInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleImportCsvFile(file);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      <Sidebar
        session={session}
        customization={customization}
        vehicles={visibleVehicles}
        selectedVehicleId={effectiveSelectedVehicleId}
        onSelectVehicle={(id) => {
          setSelectedVehicleId(id);
        }}
        reportScope={reportScope}
        onSelectScope={setReportScope}
        latestOdoByVehicle={latestOdoByVehicle}
        countsByVehicle={countsByVehicle}
        onAddVehicleClick={openCreateVehicleModal}
        onEditVehicleClick={(v) => {
          setEditingVehicle(v);
          setVehicleModalOpen(true);
        }}
        onDeleteVehicle={handleDeleteVehicle}
        onImportCsvFile={handleImportCsvFile}
        onExportCsv={handleExportCsv}
        onPrintReport={() => window.print()}
        onOpenAndroidInstall={() => setAndroidModalOpen(true)}
        onOpenAccountThemeModal={() => setAccountModalOpen(true)}
        fileSyncLinked={Boolean(linkedFileHandle)}
        hasUnsyncedChanges={hasUnsyncedChanges}
        onOpenFileSync={() => setSyncModalOpen(true)}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Top Bar Contract: Breadcrumb on Left, Single Primary Action on Right */}
        <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
              aria-label="Mở danh sách xe và điều hướng"
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav
              aria-label="Vị trí hiện tại"
              className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500"
            >
              <span className="hidden text-slate-700 sm:inline whitespace-nowrap">Sổ Xe</span>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="truncate font-semibold text-slate-900">
                {visibleVehicles.length === 0
                  ? session.displayUsername
                  : effectiveSelectedVehicleId === 'all'
                    ? 'Tất cả xe'
                    : selectedVehicle?.name ?? '...'}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="truncate text-slate-600">{scopeTitleMap[reportScope]}</span>
            </nav>
          </div>

          {visibleVehicles.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (entryExpanded && !editingFuel && !editingMaintenance) {
                  setEntryExpanded(false);
                } else {
                  setEditingFuel(null);
                  setEditingMaintenance(null);
                  setEntryTab(reportScope === 'maintenance' ? 'maintenance' : 'fuel');
                  setEntryExpanded(true);
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 ${palette.primaryBg} ${palette.primaryHover}`}
            >
              <Plus className="h-3.5 w-3.5" />
              {entryExpanded ? 'Đóng nhập liệu' : 'Ghi nhận mới'}
            </button>
          ) : (
            <button
              type="button"
              onClick={openCreateVehicleModal}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 ${palette.primaryBg} ${palette.primaryHover}`}
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo mới xe
            </button>
          )}
        </header>

        {/* Auto-dismissing 1-second Floating Toast Notification */}
        {notice && (
          <div
            role="status"
            aria-live="polite"
            className="no-print fixed top-16 right-4 z-[60] flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm"
          >
            <Check className="h-4 w-4 shrink-0" />
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="ml-1 rounded p-0.5 text-emerald-100 hover:bg-emerald-700 hover:text-white"
              aria-label="Đóng thông báo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Workspace Container */}
        <main className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">

          {loadError && (
            <div className="no-print rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
              {loadError}
            </div>
          )}

          {/* Post-login Import CSV / Create New Vehicle Prompt (only when user has 0 vehicles) */}
          {visibleVehicles.length === 0 && (
            <PostLoginSetup
              session={session}
              hasVehicles={false}
              customization={customization}
              onImportCsvFile={handleImportCsvFile}
              onCreateNewVehicle={openCreateVehicleModal}
            />
          )}

          {visibleVehicles.length > 0 && (
            <>
              {/* Stylized Car Odometer Cluster & Latest Refueling Card */}
              <VehicleOdoCluster
                selectedVehicle={selectedVehicle}
                totalVehiclesCount={visibleVehicles.length}
                latestOdo={clusterLatestOdo}
                latestFuelLog={latestFuelLog}
                previousFuelLog={previousFuelLog}
                latestFuelVehicle={latestFuelVehicle}
                customization={customization}
                onAddFuelClick={() => openEntryPanel('fuel')}
                onImportCsvClick={() => bannerCsvInputRef.current?.click()}
                onCreateVehicleClick={openCreateVehicleModal}
                onEditVehicleClick={(v) => {
                  setEditingVehicle(v);
                  setVehicleModalOpen(true);
                }}
                onOpenCustomizeClick={() => setAccountModalOpen(true)}
              />

              {/* Expandable Data Entry Panel (Fuel + Maintenance) */}
              <ExpandableEntryPanel
                expanded={entryExpanded}
                onToggleExpand={() => setEntryExpanded((prev) => !prev)}
                activeTab={entryTab}
                onTabChange={setEntryTab}
                vehicles={visibleVehicles}
                selectedVehicleId={effectiveSelectedVehicleId}
                latestOdoByVehicle={latestOdoByVehicle}
                latestUnitPriceByVehicle={latestUnitPriceByVehicle}
                recentMaintenanceTitles={recentMaintenanceTitles}
                editingFuel={editingFuel}
                editingMaintenance={editingMaintenance}
                onCancelEdit={() => {
                  setEditingFuel(null);
                  setEditingMaintenance(null);
                }}
                onSaveFuel={handleSaveFuel}
                onSaveMaintenance={handleSaveMaintenance}
              />

              {/* Report Header & Period Filters */}
              <ReportToolbar
                vehicles={visibleVehicles}
                selectedVehicleId={effectiveSelectedVehicleId}
                onSelectVehicle={setSelectedVehicleId}
                reportScope={reportScope}
                onSelectScope={setReportScope}
                timeFilter={timeFilter}
                onTimeFilterChange={setTimeFilter}
                analytics={analytics}
              />

              {/* KPI Summary Strip */}
              <KpiStrip analytics={analytics} scope={reportScope} />

              {/* Charts & Cost Breakdowns */}
              <ReportCharts
                analytics={analytics}
                scope={reportScope}
                onOpenAddEntry={openEntryPanel}
              />

              {/* High-Density History Tables */}
              <LedgerTables
                scope={reportScope}
                fuelLogs={analytics.filteredFuel}
                maintenanceLogs={analytics.filteredMaintenance}
                vehiclesById={vehiclesById}
                showVehicleColumn={effectiveSelectedVehicleId === 'all'}
                onEditFuel={handleEditFuel}
                onDeleteFuel={handleDeleteFuel}
                onEditMaintenance={handleEditMaintenance}
                onDeleteMaintenance={handleDeleteMaintenance}
                onOpenAddEntry={openEntryPanel}
              />
            </>
          )}
        </main>
      </div>

      {/* Add / Edit Vehicle Modal */}
      <AddVehicleModal
        open={vehicleModalOpen}
        editingVehicle={editingVehicle}
        defaultPlate={session.role === 'user' ? session.displayUsername : ''}
        onClose={() => {
          setVehicleModalOpen(false);
          setEditingVehicle(null);
        }}
        onSave={handleSaveVehicle}
      />

      {/* Account, Password, UI Customization & Admin Modal */}
      <AccountThemeModal
        open={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        session={session}
        accounts={accounts}
        vehicles={vehicles}
        customization={customization}
        onChangeCustomization={setCustomization}
        onChangePassword={handleChangePassword}
        onResetAccountPassword={handleResetAccountPassword}
        onCreatePlateAccount={handleCreatePlateAccount}
      />

      {/* Free Cross-Device Portable File Sync Modal */}
      <FileSyncModal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        localData={{
          vehicles,
          fuelLogs,
          maintenanceLogs,
          accounts,
        }}
        customization={customization}
        lastSyncAt={lastSyncAt}
        hasUnsyncedChanges={hasUnsyncedChanges}
        linkedHandle={linkedFileHandle}
        autoWriteLinkedFile={autoWriteLinkedFile}
        onToggleAutoWrite={handleToggleAutoWrite}
        onSetLinkedHandle={handleSetLinkedHandle}
        onApplySyncedData={handleApplySyncedData}
        onMarkSynced={handleMarkSynced}
      />

      {/* Android Offline / APK Install Modal */}
      <AndroidInstallModal
        open={androidModalOpen}
        onClose={() => setAndroidModalOpen(false)}
      />

      {/* Offline Status Indicator */}
      <OfflineIndicator />
    </div>
  );
}
