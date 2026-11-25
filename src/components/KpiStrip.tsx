import React from 'react';
import { ReportScope } from '../types';
import { VehicleReportAnalytics } from '../utils/analytics';
import { formatNumber, formatVnd } from '../utils/format';

interface KpiStripProps {
  analytics: VehicleReportAnalytics;
  scope: ReportScope;
}

export function KpiStrip({ analytics, scope }: KpiStripProps) {
  const {
    totalOperatingCost,
    totalFuelCost,
    totalMaintenanceCost,
    totalLitres,
    distanceKm,
    avgConsumption,
    avgUnitPrice,
    fuelCostPerKm,
    totalCostPerKm,
    filteredFuel,
    filteredMaintenance,
  } = analytics;

  const avgMaintCost =
    filteredMaintenance.length > 0
      ? Math.round(totalMaintenanceCost / filteredMaintenance.length)
      : 0;

  const largestMaint = filteredMaintenance.reduce(
    (max, item) => (item.totalCost > max.totalCost ? item : max),
    { title: '', totalCost: 0 }
  );

  const cards =
    scope === 'fuel'
      ? [
          {
            label: 'Tổng chi phí nhiên liệu',
            value: formatVnd(totalFuelCost),
            sub: `${filteredFuel.length} lần đổ · ${
              fuelCostPerKm !== null ? `${formatNumber(fuelCostPerKm)} đ/km` : 'Chưa đủ dữ liệu km'
            }`,
            accent: 'text-blue-700',
          },
          {
            label: 'Tiêu hao trung bình',
            value: avgConsumption !== null ? `${formatNumber(avgConsumption, 2)} L/100km` : '—',
            sub:
              analytics.minConsumption !== null && analytics.maxConsumption !== null
                ? `Biên độ ${formatNumber(analytics.minConsumption, 2)} – ${formatNumber(analytics.maxConsumption, 2)} L`
                : 'Cần từ 2 mốc ODO',
            accent: 'text-teal-700',
          },
          {
            label: 'Tổng lượng nhiên liệu',
            value: `${formatNumber(totalLitres, 2)} lít`,
            sub:
              avgUnitPrice !== null
                ? `Đơn giá TB: ${formatNumber(avgUnitPrice)} đ/lít`
                : 'Chưa có đơn giá',
            accent: 'text-slate-900',
          },
          {
            label: 'Quãng đường di chuyển',
            value: distanceKm > 0 ? `${formatNumber(distanceKm)} km` : '—',
            sub:
              analytics.latestOdo > 0
                ? `ODO gần nhất: ${formatNumber(analytics.latestOdo)} km`
                : 'Chưa ghi nhận ODO',
            accent: 'text-slate-900',
          },
        ]
      : scope === 'maintenance'
        ? [
            {
              label: 'Tổng chi phí bảo dưỡng & sửa chữa',
              value: formatVnd(totalMaintenanceCost),
              sub: `${filteredMaintenance.length} hạng mục trong kỳ`,
              accent: 'text-amber-700',
            },
            {
              label: 'Chi phí trung bình / hạng mục',
              value: filteredMaintenance.length > 0 ? formatVnd(avgMaintCost) : '—',
              sub:
                distanceKm > 0 && totalMaintenanceCost > 0
                  ? `Bình quân ${formatNumber(Math.round(totalMaintenanceCost / distanceKm))} đ/km`
                  : 'Tính trên các lần phát sinh',
              accent: 'text-slate-900',
            },
            {
              label: 'Hạng mục chi phí cao nhất',
              value: largestMaint.totalCost > 0 ? formatVnd(largestMaint.totalCost) : '—',
              sub: largestMaint.title ? largestMaint.title : 'Không có dữ liệu',
              accent: 'text-slate-900',
            },
            {
              label: 'Tỷ trọng trong tổng vận hành',
              value:
                totalOperatingCost > 0
                  ? `${formatNumber((totalMaintenanceCost / totalOperatingCost) * 100, 1)}%`
                  : '—',
              sub: `Tổng vận hành: ${formatVnd(totalOperatingCost)}`,
              accent: 'text-slate-900',
            },
          ]
        : [
            {
              label: 'Tổng chi phí vận hành',
              value: formatVnd(totalOperatingCost),
              sub:
                totalCostPerKm !== null
                  ? `Bình quân ${formatNumber(totalCostPerKm)} đ/km · ${formatNumber(distanceKm)} km`
                  : `${filteredFuel.length + filteredMaintenance.length} khoản ghi nhận`,
              accent: 'text-slate-900',
            },
            {
              label: 'Chi phí nhiên liệu',
              value: formatVnd(totalFuelCost),
              sub: `${formatNumber(totalLitres, 1)} lít · ${filteredFuel.length} lần đổ`,
              accent: 'text-blue-700',
            },
            {
              label: 'Chi phí bảo dưỡng & sửa chữa',
              value: formatVnd(totalMaintenanceCost),
              sub: `${filteredMaintenance.length} hạng mục phát sinh`,
              accent: 'text-amber-700',
            },
            {
              label: 'Tiêu hao nhiên liệu TB',
              value: avgConsumption !== null ? `${formatNumber(avgConsumption, 2)} L/100km` : '—',
              sub:
                avgUnitPrice !== null
                  ? `Giá xăng TB: ${formatNumber(avgUnitPrice)} đ/lít`
                  : 'Chưa có dữ liệu xăng',
              accent: 'text-teal-700',
            },
          ];

  return (
    <section
      aria-label="Chỉ số tổng hợp kỳ báo cáo"
      className="grid grid-cols-1 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x"
    >
      {cards.map((card, index) => (
        <div
          key={card.label}
          className={`px-5 py-4 ${
            index === 1 ? 'sm:border-l sm:border-slate-200 lg:border-l-0' : ''
          } ${index >= 2 ? 'sm:border-t sm:border-slate-200 lg:border-t-0' : ''}`}
        >
          <div className="text-xs font-medium text-slate-500">{card.label}</div>
          <div
            className={`mt-1.5 font-mono text-xl font-semibold tracking-tight tabular-nums ${card.accent}`}
          >
            {card.value}
          </div>
          <div className="mt-1 truncate text-xs text-slate-500" title={card.sub}>
            {card.sub}
          </div>
        </div>
      ))}
    </section>
  );
}
