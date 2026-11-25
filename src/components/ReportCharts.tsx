import React from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ReportScope } from '../types';
import { VehicleReportAnalytics } from '../utils/analytics';
import { formatDateDisplay, formatNumber, formatVnd, formatVndCompact } from '../utils/format';

interface ReportChartsProps {
  analytics: VehicleReportAnalytics;
  scope: ReportScope;
  onOpenAddEntry: (tab: 'fuel' | 'maintenance') => void;
}

const CATEGORY_COLORS = [
  '#D97706',
  '#1D4ED8',
  '#0F766E',
  '#475569',
  '#B45309',
  '#0369A1',
  '#64748B',
];

export function ReportCharts({ analytics, scope, onOpenAddEntry }: ReportChartsProps) {
  const {
    chartSeries,
    efficiencySeries,
    maintenanceByCategory,
    totalFuelCost,
    totalMaintenanceCost,
    totalOperatingCost,
  } = analytics;

  const hasChartData = chartSeries.some(
    (b) => b.fuelCost > 0 || b.maintenanceCost > 0 || b.litres > 0
  );

  const efficiencyValid = efficiencySeries.filter(
    (p) => (p.consumption !== null && p.consumption > 0) || p.unitPrice > 0
  );

  const showFuelBars = scope === 'overview' || scope === 'fuel';
  const showMaintenanceBars = scope === 'overview' || scope === 'maintenance';

  return (
    <div className="space-y-6">
      {/* Row 1: Main Time-Series Cost Bar Chart + Breakdown Panel */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Main Bar Chart */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 xl:col-span-8">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {scope === 'fuel'
                  ? 'Chi phí & sản lượng nhiên liệu theo thời gian'
                  : scope === 'maintenance'
                    ? 'Chi phí bảo dưỡng & sửa chữa theo thời gian'
                    : 'Chi phí nhiên liệu và bảo dưỡng theo thời gian'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Kỳ báo cáo: {analytics.bounds.label}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-600">
              {showFuelBars && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-blue-700" aria-hidden="true" />
                  Nhiên liệu
                </span>
              )}
              {showMaintenanceBars && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" aria-hidden="true" />
                  Bảo dưỡng / Sửa chữa
                </span>
              )}
            </div>
          </div>

          {hasChartData ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartSeries}
                  margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatVndCompact(v)}
                    tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                    axisLine={false}
                    tickLine={false}
                    width={54}
                  />
                  <Tooltip
                    cursor={{ fill: '#F1F5F9' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const row = payload[0]?.payload;
                      return (
                        <div className="rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-sm">
                          <div className="mb-1.5 font-semibold text-slate-900">{label}</div>
                          <div className="space-y-1 font-mono tabular-nums">
                            {showFuelBars && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-600">Nhiên liệu:</span>
                                <span className="font-semibold text-blue-700">
                                  {formatVnd(row.fuelCost)}
                                </span>
                              </div>
                            )}
                            {showFuelBars && row.litres > 0 && (
                              <div className="flex items-center justify-between gap-4 text-slate-500">
                                <span>Sản lượng:</span>
                                <span>
                                  {formatNumber(row.litres, 2)} L ({row.fuelCount} lần)
                                </span>
                              </div>
                            )}
                            {showMaintenanceBars && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-600">Bảo dưỡng:</span>
                                <span className="font-semibold text-amber-600">
                                  {formatVnd(row.maintenanceCost)}
                                </span>
                              </div>
                            )}
                            {scope === 'overview' && (
                              <div className="mt-1 flex items-center justify-between gap-4 border-t border-slate-100 pt-1 text-slate-900">
                                <span className="font-sans font-medium">Tổng cộng:</span>
                                <span className="font-semibold">{formatVnd(row.totalCost)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                  {showFuelBars && (
                    <Bar
                      dataKey="fuelCost"
                      name="Nhiên liệu"
                      stackId={scope === 'overview' ? 'cost' : undefined}
                      fill="#1D4ED8"
                      radius={
                        scope === 'overview' && totalMaintenanceCost > 0
                          ? [0, 0, 2, 2]
                          : [3, 3, 0, 0]
                      }
                      maxBarSize={42}
                    />
                  )}
                  {showMaintenanceBars && (
                    <Bar
                      dataKey="maintenanceCost"
                      name="Bảo dưỡng"
                      stackId={scope === 'overview' ? 'cost' : undefined}
                      fill="#F59E0B"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={42}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-72 flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center">
              <p className="text-sm font-medium text-slate-700">
                Chưa có dữ liệu phát sinh trong kỳ {analytics.bounds.label}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Hãy chọn khoảng thời gian khác hoặc ghi nhận lần đổ xăng / bảo dưỡng mới.
              </p>
              <button
                type="button"
                onClick={() => onOpenAddEntry(scope === 'maintenance' ? 'maintenance' : 'fuel')}
                className="mt-4 rounded-md bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-800"
              >
                Ghi nhận dữ liệu mới
              </button>
            </div>
          )}
        </div>

        {/* Right Breakdown Panel */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 xl:col-span-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {scope === 'fuel'
              ? 'Chỉ số hiệu suất nhiên liệu'
              : scope === 'maintenance'
                ? 'Cơ cấu chi phí theo nhóm bảo dưỡng'
                : 'Tỷ trọng chi phí vận hành'}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {scope === 'fuel'
              ? 'Tổng hợp biên độ tiêu hao & đơn giá trong kỳ'
              : scope === 'maintenance'
                ? 'Phân bổ chi phí theo danh mục hạng mục'
                : 'So sánh nhiên liệu với bảo dưỡng & sửa chữa'}
          </p>

          {scope === 'fuel' ? (
            <div className="mt-5 divide-y divide-slate-100 text-sm">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">Tiêu hao trung bình</span>
                <span className="font-mono font-semibold tabular-nums text-teal-700">
                  {analytics.avgConsumption !== null
                    ? `${formatNumber(analytics.avgConsumption, 2)} L/100km`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">Thấp nhất / Cao nhất</span>
                <span className="font-mono tabular-nums text-slate-900">
                  {analytics.minConsumption !== null && analytics.maxConsumption !== null
                    ? `${formatNumber(analytics.minConsumption, 2)} – ${formatNumber(analytics.maxConsumption, 2)} L`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">Đơn giá nhiên liệu TB</span>
                <span className="font-mono tabular-nums text-slate-900">
                  {analytics.avgUnitPrice !== null
                    ? `${formatNumber(analytics.avgUnitPrice)} đ/L`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">Tổng lượng nhiên liệu</span>
                <span className="font-mono tabular-nums text-slate-900">
                  {formatNumber(analytics.totalLitres, 2)} lít
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">Quãng đường di chuyển</span>
                <span className="font-mono tabular-nums text-slate-900">
                  {analytics.distanceKm > 0 ? `${formatNumber(analytics.distanceKm)} km` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">Chi phí xăng / km</span>
                <span className="font-mono font-semibold tabular-nums text-slate-900">
                  {analytics.fuelCostPerKm !== null
                    ? `${formatNumber(analytics.fuelCostPerKm)} đ/km`
                    : '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {/* Overview split bar */}
              {scope === 'overview' && totalOperatingCost > 0 && (
                <div className="space-y-2.5">
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="bg-blue-700"
                      style={{
                        width: `${(totalFuelCost / totalOperatingCost) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-amber-500"
                      style={{
                        width: `${(totalMaintenanceCost / totalOperatingCost) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="text-xs text-slate-500">Nhiên liệu</div>
                      <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900">
                        {formatVnd(totalFuelCost)}
                      </div>
                      <div className="font-mono text-xs tabular-nums text-blue-700">
                        {formatNumber((totalFuelCost / totalOperatingCost) * 100, 1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Bảo dưỡng & Sửa chữa</div>
                      <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900">
                        {formatVnd(totalMaintenanceCost)}
                      </div>
                      <div className="font-mono text-xs tabular-nums text-amber-600">
                        {formatNumber((totalMaintenanceCost / totalOperatingCost) * 100, 1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Maintenance category breakdown */}
              <div className={scope === 'overview' ? 'border-t border-slate-100 pt-4' : ''}>
                {scope === 'overview' && (
                  <div className="mb-3 text-xs font-semibold text-slate-700">
                    Chi tiết nhóm bảo dưỡng trong kỳ
                  </div>
                )}

                {maintenanceByCategory.length > 0 ? (
                  <div className="space-y-3">
                    {maintenanceByCategory.slice(0, 6).map((cat, idx) => (
                      <div key={cat.categoryName} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="truncate font-medium text-slate-800">
                            {cat.categoryName}{' '}
                            <span className="font-normal text-slate-400">({cat.count})</span>
                          </span>
                          <span className="font-mono tabular-nums text-slate-900 shrink-0">
                            {formatVnd(cat.totalCost)} · {formatNumber(cat.share, 0)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(cat.share, 2)}%`,
                              backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-xs text-slate-500">
                    Không có khoản chi bảo dưỡng hoặc sửa chữa nào trong kỳ này.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Fuel Consumption (L/100km) & Unit Price Trend Chart (shown on overview & fuel) */}
      {(scope === 'overview' || scope === 'fuel') && efficiencyValid.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Xu hướng tiêu hao nhiên liệu (L/100km) & Biến động giá xăng (đ/lít)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Theo dõi từng lần đổ xăng trong kỳ ({efficiencyValid.length} điểm dữ liệu)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-teal-700" aria-hidden="true" />
                Tiêu hao (L/100km)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-slate-400" aria-hidden="true" />
                Đơn giá (đ/lít)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={efficiencyValid}
                margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="consumptionFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F766E" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#0F766E" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="shortDate"
                  tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                  minTickGap={20}
                />
                <YAxis
                  yAxisId="left"
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => `${v}`}
                  tick={{ fontSize: 11, fill: '#0F766E', fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => formatVndCompact(v)}
                  tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const pt = payload[0]?.payload;
                    return (
                      <div className="rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-sm">
                        <div className="mb-1.5 font-semibold text-slate-900">
                          {formatDateDisplay(pt.date, true)}
                        </div>
                        <div className="space-y-1 font-mono tabular-nums">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-sans text-slate-600">ODO:</span>
                            <span className="text-slate-900">{formatNumber(pt.odo)} km</span>
                          </div>
                          {pt.consumption !== null && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-sans text-slate-600">Tiêu hao:</span>
                              <span className="font-semibold text-teal-700">
                                {formatNumber(pt.consumption, 2)} L/100km
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-sans text-slate-600">Đơn giá:</span>
                            <span className="text-slate-800">
                              {formatNumber(pt.unitPrice)} đ/L
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-sans text-slate-600">Đổ vào:</span>
                            <span className="text-slate-800">
                              {formatNumber(pt.litres, 2)} L · {formatVnd(pt.totalCost)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="consumption"
                  name="Tiêu hao (L/100km)"
                  stroke="#0F766E"
                  strokeWidth={2}
                  fill="url(#consumptionFill)"
                  connectNulls
                  dot={efficiencyValid.length <= 25 ? { r: 3, fill: '#0F766E', strokeWidth: 0 } : false}
                  activeDot={{ r: 5, fill: '#0F766E' }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="unitPrice"
                  name="Đơn giá (đ/lít)"
                  stroke="#94A3B8"
                  strokeWidth={1.75}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={{ r: 4, fill: '#475569' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
