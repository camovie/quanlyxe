/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Menu, Plus, X } from 'lucide-react';
import { AddVehicleModal } from './components/AddVehicleModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { ExpandableEntryPanel } from './components/ExpandableEntryPanel';
import { KpiStrip } from './components/KpiStrip';
import { LedgerTables } from './components/LedgerTables';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ReportCharts } from './components/ReportCharts';
import { ReportToolbar } from './components/ReportToolbar';
import { Sidebar } from './components/Sidebar';
import { createSecondarySampleVehicles } from './data/sampleVehicles';
import {
  EntryFormTab,
  FuelLog,
  MaintenanceLog,
  ReportScope,
  TimeFilter,
  Vehicle,
} from './types';
import { computeVehicleAnalytics, getPeriodBounds, isTimestampInBounds } from './utils/analytics';
import { extractDateOnly } from './utils/format';
import {
  exportFuelioCsv,
  parseFuelioCsv,
  recalculateVehicleFuelLogs,
} from './utils/fuelioCsv';

const STORAGE_KEY = 'so_xe_fleet_ledger_v1';
const ATTACHED_CSV_URL = '/assets/aistudio/car2-20260824-083541_5714fd97.csv';

interface PersistedState {
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  selectedVehicleId: string;
}

export default function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  // Vehicle modal, Android install modal & mobile drawer
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [androidModalOpen, setAndroidModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initial data bootstrap: localStorage or parse attached Fuelio CSV + secondary vehicles
  useEffect(() => {
    let cancelled = false;

    async function initData() {
      try {
        const cachedRaw = localStorage.getItem(STORAGE_KEY);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw) as PersistedState;
          if (Array.isArray(parsed.vehicles) && parsed.vehicles.length > 0) {
            if (!cancelled) {
              setVehicles(parsed.vehicles);
              setFuelLogs(parsed.fuelLogs ?? []);
              setMaintenanceLogs(parsed.maintenanceLogs ?? []);
              const validSelected =
                parsed.selectedVehicleId === 'all' ||
                parsed.vehicles.some((v) => v.id === parsed.selectedVehicleId)
                  ? parsed.selectedVehicleId
                  : parsed.vehicles[0].id;
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
        const secondary = createSecondarySampleVehicles();

        const initialVehicles = [primaryBundle.vehicle, ...secondary.vehicles];
        const initialFuel = [...primaryBundle.fuelLogs, ...secondary.fuelLogs];
        const initialMaint = [...primaryBundle.maintenanceLogs, ...secondary.maintenanceLogs];

        if (!cancelled) {
          setVehicles(initialVehicles);
          setFuelLogs(initialFuel);
          setMaintenanceLogs(initialMaint);
          setSelectedVehicleId(primaryBundle.vehicle.id);

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
          setLoadError(
            err instanceof Error ? err.message : 'Lỗi đọc dữ liệu ban đầu.'
          );
          const secondary = createSecondarySampleVehicles();
          setVehicles(secondary.vehicles);
          setFuelLogs(secondary.fuelLogs);
          setMaintenanceLogs(secondary.maintenanceLogs);
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

  // Persist changes to localStorage
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

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice((prev) => (prev === msg ? null : prev)), 4000);
  };

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
    for (const v of vehicles) map[v.id] = { fuel: 0, maintenance: 0 };
    for (const l of fuelLogs) {
      if (!map[l.vehicleId]) map[l.vehicleId] = { fuel: 0, maintenance: 0 };
      map[l.vehicleId].fuel += 1;
    }
    for (const m of maintenanceLogs) {
      if (!map[m.vehicleId]) map[m.vehicleId] = { fuel: 0, maintenance: 0 };
      map[m.vehicleId].maintenance += 1;
    }
    return map;
  }, [vehicles, fuelLogs, maintenanceLogs]);

  // Scoped logs for selected vehicle (or all)
  const scopedFuelLogs = useMemo(
    () =>
      selectedVehicleId === 'all'
        ? fuelLogs
        : fuelLogs.filter((l) => l.vehicleId === selectedVehicleId),
    [fuelLogs, selectedVehicleId]
  );

  const scopedMaintenanceLogs = useMemo(
    () =>
      selectedVehicleId === 'all'
        ? maintenanceLogs
        : maintenanceLogs.filter((m) => m.vehicleId === selectedVehicleId),
    [maintenanceLogs, selectedVehicleId]
  );

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

  // Report analytics for selected vehicle + period
  const analytics = useMemo(
    () => computeVehicleAnalytics(scopedFuelLogs, scopedMaintenanceLogs, timeFilter),
    [scopedFuelLogs, scopedMaintenanceLogs, timeFilter]
  );

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

    if (selectedVehicleId !== 'all' && selectedVehicleId !== log.vehicleId) {
      setSelectedVehicleId(log.vehicleId);
    }
    ensureDateVisible(log.timestamp, log.date);
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

    if (selectedVehicleId !== 'all' && selectedVehicleId !== log.vehicleId) {
      setSelectedVehicleId(log.vehicleId);
    }
    ensureDateVisible(log.timestamp, log.date);
  };

  const handleDeleteMaintenance = (id: string) => {
    setMaintenanceLogs((prev) => prev.filter((m) => m.id !== id));
    if (editingMaintenance?.id === id) setEditingMaintenance(null);
    showNotice('Đã xóa hạng mục bảo dưỡng / sửa chữa.');
  };

  // Handlers: Vehicles CRUD
  const handleSaveVehicle = (vehicle: Vehicle) => {
    setVehicles((prev) => {
      const exists = prev.some((v) => v.id === vehicle.id);
      if (exists) {
        return prev.map((v) => (v.id === vehicle.id ? vehicle : v));
      }
      return [...prev, vehicle];
    });
    setSelectedVehicleId(vehicle.id);
    showNotice(
      editingVehicle
        ? `Đã cập nhật thông tin xe "${vehicle.name}".`
        : `Đã thêm xe mới "${vehicle.name}".`
    );
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    const target = vehicles.find((v) => v.id === vehicleId);
    setVehicles((prev) => {
      const remaining = prev.filter((v) => v.id !== vehicleId);
      if (selectedVehicleId === vehicleId) {
        setSelectedVehicleId(remaining[0]?.id ?? 'all');
      }
      return remaining;
    });
    setFuelLogs((prev) => prev.filter((l) => l.vehicleId !== vehicleId));
    setMaintenanceLogs((prev) => prev.filter((m) => m.vehicleId !== vehicleId));
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
        const finalVehicle: Vehicle = existingId
          ? {
              ...bundle.vehicle,
              id: `${bundle.vehicle.id}_${Date.now()}`,
              name: `${bundle.vehicle.name} (Nhập mới)`,
            }
          : bundle.vehicle;

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
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditFuel = (log: FuelLog) => {
    setEditingMaintenance(null);
    setEditingFuel(log);
    setEntryTab('fuel');
    setEntryExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditMaintenance = (log: MaintenanceLog) => {
    setEditingFuel(null);
    setEditingMaintenance(log);
    setEntryTab('maintenance');
    setEntryExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const scopeTitleMap: Record<ReportScope, string> = {
    overview: 'Tổng quan báo cáo',
    fuel: 'Báo cáo nhiên liệu',
    maintenance: 'Bảo dưỡng & Sửa chữa',
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={(id) => {
          setSelectedVehicleId(id);
        }}
        reportScope={reportScope}
        onSelectScope={setReportScope}
        latestOdoByVehicle={latestOdoByVehicle}
        countsByVehicle={countsByVehicle}
        onAddVehicleClick={() => {
          setEditingVehicle(null);
          setVehicleModalOpen(true);
        }}
        onEditVehicleClick={(v) => {
          setEditingVehicle(v);
          setVehicleModalOpen(true);
        }}
        onDeleteVehicle={handleDeleteVehicle}
        onImportCsvFile={handleImportCsvFile}
        onExportCsv={handleExportCsv}
        onPrintReport={() => window.print()}
        onOpenAndroidInstall={() => setAndroidModalOpen(true)}
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
                {selectedVehicleId === 'all' ? 'Tất cả xe' : selectedVehicle?.name ?? '...'}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="truncate text-slate-600">{scopeTitleMap[reportScope]}</span>
            </nav>
          </div>

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
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            {entryExpanded ? 'Đóng nhập liệu' : 'Ghi nhận mới'}
          </button>
        </header>

        {/* Workspace Container */}
        <main className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {notice && (
            <div className="no-print flex items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-900">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="rounded p-0.5 text-blue-700 hover:bg-blue-100"
                aria-label="Đóng thông báo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {loadError && (
            <div className="no-print rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
              {loadError}
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              <div className="h-14 animate-pulse rounded-lg border border-slate-200 bg-white" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white"
                  />
                ))}
              </div>
              <div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-white" />
            </div>
          ) : (
            <>
              {/* Expandable Data Entry Panel (Fuel + Maintenance) */}
              <ExpandableEntryPanel
                expanded={entryExpanded}
                onToggleExpand={() => setEntryExpanded((prev) => !prev)}
                activeTab={entryTab}
                onTabChange={setEntryTab}
                vehicles={vehicles}
                selectedVehicleId={selectedVehicleId}
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
                vehicles={vehicles}
                selectedVehicleId={selectedVehicleId}
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
                showVehicleColumn={selectedVehicleId === 'all'}
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
        onClose={() => {
          setVehicleModalOpen(false);
          setEditingVehicle(null);
        }}
        onSave={handleSaveVehicle}
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
