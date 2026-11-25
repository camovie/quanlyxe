import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ReportScope, TimeFilter, TimeFilterMode, Vehicle } from '../types';
import { VehicleReportAnalytics } from '../utils/analytics';
import { formatNumber } from '../utils/format';

interface ReportToolbarProps {
  vehicles: Vehicle[];
  selectedVehicleId: string;
  onSelectVehicle: (id: string) => void;
  reportScope: ReportScope;
  onSelectScope: (scope: ReportScope) => void;
  timeFilter: TimeFilter;
  onTimeFilterChange: (next: TimeFilter) => void;
  analytics: VehicleReportAnalytics;
}

const MONTHS = [
  { value: 1, label: 'Tháng 01' },
  { value: 2, label: 'Tháng 02' },
  { value: 3, label: 'Tháng 03' },
  { value: 4, label: 'Tháng 04' },
  { value: 5, label: 'Tháng 05' },
  { value: 6, label: 'Tháng 06' },
  { value: 7, label: 'Tháng 07' },
  { value: 8, label: 'Tháng 08' },
  { value: 9, label: 'Tháng 09' },
  { value: 10, label: 'Tháng 10' },
  { value: 11, label: 'Tháng 11' },
  { value: 12, label: 'Tháng 12' },
];

export function ReportToolbar({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  reportScope,
  onSelectScope,
  timeFilter,
  onTimeFilterChange,
  analytics,
}: ReportToolbarProps) {
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    new Set([...analytics.availableYears, timeFilter.year, currentYear])
  ).sort((a, b) => b - a);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const setMode = (mode: TimeFilterMode) => {
    onTimeFilterChange({ ...timeFilter, mode });
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(timeFilter.year, timeFilter.month - 1 + delta, 1);
    onTimeFilterChange({
      ...timeFilter,
      mode: 'month',
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    });
  };

  const shiftYear = (delta: number) => {
    onTimeFilterChange({
      ...timeFilter,
      mode: 'year',
      year: timeFilter.year + delta,
    });
  };

  const timeModes: Array<{ id: TimeFilterMode; label: string }> = [
    { id: 'month', label: 'Theo tháng' },
    { id: 'year', label: 'Theo năm' },
    { id: 'custom', label: 'Tùy chọn' },
    { id: 'all', label: 'Toàn bộ' },
  ];

  const scopes: Array<{ id: ReportScope; label: string }> = [
    { id: 'overview', label: 'Tổng hợp' },
    { id: 'fuel', label: 'Nhiên liệu' },
    { id: 'maintenance', label: 'Bảo dưỡng & Sửa chữa' },
  ];

  return (
    <section className="space-y-4">
      {/* Title & Vehicle Context */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {selectedVehicleId === 'all'
              ? 'Báo cáo toàn đội xe'
              : `Báo cáo xe ${selectedVehicle?.name ?? ''}`}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>Kỳ báo cáo: {analytics.bounds.label}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {analytics.filteredFuel.length} lần đổ xăng
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {analytics.filteredMaintenance.length} hạng mục bảo dưỡng
            </span>
            {analytics.latestOdo > 0 && selectedVehicleId !== 'all' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  ODO mới nhất: {formatNumber(analytics.latestOdo)} km
                </span>
              </>
            )}
            {selectedVehicle?.plate && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{selectedVehicle.plate}</span>
              </>
            )}
          </div>
        </div>

        {/* Inline Vehicle Quick Selector (useful on all viewports & mobile) */}
        <div className="no-print flex items-center gap-2 shrink-0">
          <label
            htmlFor="toolbar-vehicle-select"
            className="text-xs font-medium text-slate-500 whitespace-nowrap"
          >
            Xe đang xem:
          </label>
          <select
            id="toolbar-vehicle-select"
            value={selectedVehicleId}
            onChange={(e) => onSelectVehicle(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
          >
            <option value="all">Tất cả xe ({vehicles.length})</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} {v.plate ? `(${v.plate})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Bar: Scope + Time Filter Controls */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
        {/* Report Category Segmented Switcher */}
        <div
          className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5"
          role="tablist"
          aria-label="Phạm vi báo cáo"
        >
          {scopes.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={reportScope === s.id}
              onClick={() => onSelectScope(s.id)}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                reportScope === s.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Time Period Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5"
            role="tablist"
            aria-label="Chu kỳ báo cáo"
          >
            {timeModes.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={timeFilter.mode === m.id}
                onClick={() => setMode(m.id)}
                className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  timeFilter.mode === m.id
                    ? 'bg-white text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {timeFilter.mode === 'month' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                aria-label="Tháng trước"
                title="Tháng trước"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              <select
                value={timeFilter.month}
                onChange={(e) =>
                  onTimeFilterChange({ ...timeFilter, month: Number(e.target.value) })
                }
                aria-label="Chọn tháng"
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={timeFilter.year}
                onChange={(e) =>
                  onTimeFilterChange({ ...timeFilter, year: Number(e.target.value) })
                }
                aria-label="Chọn năm"
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                aria-label="Tháng sau"
                title="Tháng sau"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {timeFilter.mode === 'year' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftYear(-1)}
                className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                aria-label="Năm trước"
                title="Năm trước"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              <select
                value={timeFilter.year}
                onChange={(e) =>
                  onTimeFilterChange({ ...timeFilter, year: Number(e.target.value) })
                }
                aria-label="Chọn năm báo cáo"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => shiftYear(1)}
                className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                aria-label="Năm sau"
                title="Năm sau"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {timeFilter.mode === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 text-slate-600">
                <span>Từ</span>
                <input
                  type="date"
                  value={timeFilter.startDate}
                  onChange={(e) =>
                    onTimeFilterChange({ ...timeFilter, startDate: e.target.value })
                  }
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-1.5 text-slate-600">
                <span>đến</span>
                <input
                  type="date"
                  value={timeFilter.endDate}
                  onChange={(e) =>
                    onTimeFilterChange({ ...timeFilter, endDate: e.target.value })
                  }
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
