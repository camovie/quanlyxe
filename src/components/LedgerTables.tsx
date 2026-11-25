import React, { useMemo, useState } from 'react';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { FuelLog, MaintenanceLog, ReportScope, Vehicle } from '../types';
import { formatDateDisplay, formatNumber, formatVnd } from '../utils/format';

interface LedgerTablesProps {
  scope: ReportScope;
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  vehiclesById: Record<string, Vehicle>;
  showVehicleColumn: boolean;
  onEditFuel: (log: FuelLog) => void;
  onDeleteFuel: (id: string) => void;
  onEditMaintenance: (log: MaintenanceLog) => void;
  onDeleteMaintenance: (id: string) => void;
  onOpenAddEntry: (tab: 'fuel' | 'maintenance') => void;
}

const PAGE_SIZE = 20;

export function LedgerTables({
  scope,
  fuelLogs,
  maintenanceLogs,
  vehiclesById,
  showVehicleColumn,
  onEditFuel,
  onDeleteFuel,
  onEditMaintenance,
  onDeleteMaintenance,
  onOpenAddEntry,
}: LedgerTablesProps) {
  const [overviewTab, setOverviewTab] = useState<'fuel' | 'maintenance'>('fuel');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeTable: 'fuel' | 'maintenance' =
    scope === 'fuel' ? 'fuel' : scope === 'maintenance' ? 'maintenance' : overviewTab;

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const m of maintenanceLogs) {
      if (m.categoryName) set.add(m.categoryName);
    }
    return Array.from(set).sort();
  }, [maintenanceLogs]);

  const filteredFuelRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return fuelLogs;
    return fuelLogs.filter((l) => {
      const vehName = vehiclesById[l.vehicleId]?.name?.toLowerCase() ?? '';
      return (
        l.date.toLowerCase().includes(q) ||
        formatDateDisplay(l.date).includes(q) ||
        String(l.odo).includes(q) ||
        l.notes.toLowerCase().includes(q) ||
        vehName.includes(q)
      );
    });
  }, [fuelLogs, searchQuery, vehiclesById]);

  const filteredMaintenanceRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return maintenanceLogs.filter((m) => {
      if (categoryFilter !== 'all' && m.categoryName !== categoryFilter) return false;
      if (!q) return true;
      const vehName = vehiclesById[m.vehicleId]?.name?.toLowerCase() ?? '';
      return (
        m.title.toLowerCase().includes(q) ||
        m.notes.toLowerCase().includes(q) ||
        m.categoryName.toLowerCase().includes(q) ||
        m.date.toLowerCase().includes(q) ||
        formatDateDisplay(m.date).includes(q) ||
        String(m.odo).includes(q) ||
        vehName.includes(q)
      );
    });
  }, [maintenanceLogs, searchQuery, categoryFilter, vehiclesById]);

  const rowsCount =
    activeTable === 'fuel' ? filteredFuelRows.length : filteredMaintenanceRows.length;

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-3">
          {scope === 'overview' ? (
            <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setOverviewTab('fuel');
                  setVisibleLimit(PAGE_SIZE);
                  setConfirmDeleteId(null);
                }}
                className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  overviewTab === 'fuel'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lịch sử đổ nhiên liệu ({fuelLogs.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setOverviewTab('maintenance');
                  setVisibleLimit(PAGE_SIZE);
                  setConfirmDeleteId(null);
                }}
                className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  overviewTab === 'maintenance'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lịch sử bảo dưỡng & sửa chữa ({maintenanceLogs.length})
              </button>
            </div>
          ) : (
            <h2 className="text-sm font-semibold text-slate-900">
              {activeTable === 'fuel'
                ? `Bảng chi tiết đổ nhiên liệu (${filteredFuelRows.length})`
                : `Bảng chi tiết bảo dưỡng & sửa chữa (${filteredMaintenanceRows.length})`}
            </h2>
          )}
        </div>

        <div className="no-print flex flex-wrap items-center gap-2.5">
          {activeTable === 'maintenance' && availableCategories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setVisibleLimit(PAGE_SIZE);
              }}
              aria-label="Lọc theo nhóm chi phí"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
            >
              <option value="all">Tất cả nhóm</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleLimit(PAGE_SIZE);
              }}
              placeholder={
                activeTable === 'fuel'
                  ? 'Tìm theo ngày, ODO, ghi chú...'
                  : 'Tìm tên hạng mục, ghi chú...'
              }
              className="w-56 rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
            />
          </div>
        </div>
      </div>

      {/* Table Body */}
      {activeTable === 'fuel' ? (
        filteredFuelRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-600">
                  <th className="px-4 py-2.5 whitespace-nowrap">Thời gian</th>
                  {showVehicleColumn && <th className="px-4 py-2.5 whitespace-nowrap">Xe</th>}
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">ODO (km)</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Số lít</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Đơn giá (đ/L)</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Tổng chi phí</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Tiêu hao</th>
                  <th className="px-4 py-2.5">Ghi chú</th>
                  <th className="no-print px-4 py-2.5 text-right whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFuelRows.slice(0, visibleLimit).map((log) => {
                  const isConfirming = confirmDeleteId === log.id;
                  return (
                    <tr
                      key={log.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-2.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {formatDateDisplay(log.date, true)}
                      </td>
                      {showVehicleColumn && (
                        <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                          {vehiclesById[log.vehicleId]?.name ?? '—'}
                        </td>
                      )}
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                        {formatNumber(log.odo)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {formatNumber(log.litres, 2)} L
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {log.unitPrice > 0 ? formatNumber(log.unitPrice) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                        {formatVnd(log.totalCost)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                        {log.consumption !== null ? (
                          <span className="font-medium text-teal-700">
                            {formatNumber(log.consumption, 2)} L/100km
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-2.5 text-slate-500" title={log.notes}>
                        {log.notes || (log.full ? '' : 'Đổ chưa đầy bình')}
                      </td>
                      <td className="no-print px-4 py-2.5 text-right whitespace-nowrap">
                        {isConfirming ? (
                          <span className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded px-1.5 py-0.5 text-slate-600 hover:bg-slate-100"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteFuel(log.id);
                                setConfirmDeleteId(null);
                              }}
                              className="rounded bg-red-600 px-2 py-0.5 font-medium text-white hover:bg-red-700"
                            >
                              Xóa
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditFuel(log)}
                              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
                              title="Chỉnh sửa"
                              aria-label="Sửa bản ghi đổ xăng"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(log.id)}
                              className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              title="Xóa bản ghi"
                              aria-label="Xóa bản ghi đổ xăng"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              Không tìm thấy lần đổ nhiên liệu nào trong kỳ đã chọn
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Bạn có thể mở rộng bộ lọc thời gian hoặc thêm lần đổ xăng mới.
            </p>
            <button
              type="button"
              onClick={() => onOpenAddEntry('fuel')}
              className="mt-4 rounded-md bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-800"
            >
              Ghi nhận đổ nhiên liệu
            </button>
          </div>
        )
      ) : filteredMaintenanceRows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-600">
                <th className="px-4 py-2.5 whitespace-nowrap">Ngày tháng</th>
                {showVehicleColumn && <th className="px-4 py-2.5 whitespace-nowrap">Xe</th>}
                <th className="px-4 py-2.5">Hạng mục bảo dưỡng / sửa chữa</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Nhóm</th>
                <th className="px-4 py-2.5 text-right whitespace-nowrap">ODO (km)</th>
                <th className="px-4 py-2.5 text-right whitespace-nowrap">Tổng chi phí</th>
                <th className="px-4 py-2.5">Chi tiết / Ghi chú</th>
                <th className="no-print px-4 py-2.5 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMaintenanceRows.slice(0, visibleLimit).map((log) => {
                const isConfirming = confirmDeleteId === log.id;
                return (
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-2.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {formatDateDisplay(log.date, false)}
                    </td>
                    {showVehicleColumn && (
                      <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                        {vehiclesById[log.vehicleId]?.name ?? '—'}
                      </td>
                    )}
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      {log.title}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                      {log.categoryName}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {log.odo > 0 ? formatNumber(log.odo) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-amber-700 whitespace-nowrap">
                      {formatVnd(log.totalCost)}
                    </td>
                    <td
                      className="max-w-[260px] px-4 py-2.5 text-slate-500 whitespace-pre-line"
                      title={log.notes}
                    >
                      {log.notes ? log.notes.replace(/\n+/g, ' · ') : '—'}
                    </td>
                    <td className="no-print px-4 py-2.5 text-right whitespace-nowrap">
                      {isConfirming ? (
                        <span className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded px-1.5 py-0.5 text-slate-600 hover:bg-slate-100"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteMaintenance(log.id);
                              setConfirmDeleteId(null);
                            }}
                            className="rounded bg-red-600 px-2 py-0.5 font-medium text-white hover:bg-red-700"
                          >
                            Xóa
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditMaintenance(log)}
                            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
                            title="Chỉnh sửa"
                            aria-label="Sửa bản ghi bảo dưỡng"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(log.id)}
                            className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Xóa bản ghi"
                            aria-label="Xóa bản ghi bảo dưỡng"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-700">
            Không có hạng mục bảo dưỡng hoặc sửa chữa nào trong kỳ đã chọn
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Hãy chuyển sang khoảng thời gian khác hoặc ghi nhận hạng mục bảo dưỡng mới.
          </p>
          <button
            type="button"
            onClick={() => onOpenAddEntry('maintenance')}
            className="mt-4 rounded-md bg-amber-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
          >
            Ghi nhận bảo dưỡng / sửa chữa
          </button>
        </div>
      )}

      {/* Load More / Pagination Footer */}
      {rowsCount > visibleLimit && (
        <div className="no-print flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          <span className="font-mono tabular-nums">
            Đang hiển thị {Math.min(visibleLimit, rowsCount)} / {rowsCount} dòng
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVisibleLimit((prev) => prev + PAGE_SIZE)}
              className="rounded-md border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Xem thêm {Math.min(PAGE_SIZE, rowsCount - visibleLimit)} dòng
            </button>
            <button
              type="button"
              onClick={() => setVisibleLimit(rowsCount)}
              className="rounded-md px-2.5 py-1 font-medium text-blue-700 transition-colors hover:bg-blue-50"
            >
              Xem tất cả
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
