import React, { useState } from 'react';
import { Fuel, Palette, Pencil, Plus, Upload } from 'lucide-react';
import { FuelLog, UiCustomization, Vehicle } from '../types';
import { THEME_PRESETS } from '../utils/auth';
import { formatDateDisplay, formatNumber, formatVnd } from '../utils/format';

interface VehicleOdoClusterProps {
  selectedVehicle: Vehicle | null;
  totalVehiclesCount: number;
  latestOdo: number;
  latestFuelLog: FuelLog | null;
  previousFuelLog: FuelLog | null;
  latestFuelVehicle: Vehicle | null;
  customization: UiCustomization;
  onAddFuelClick: () => void;
  onImportCsvClick: () => void;
  onCreateVehicleClick: () => void;
  onEditVehicleClick: (v: Vehicle) => void;
  onOpenCustomizeClick: () => void;
}

export function VehicleOdoCluster({
  selectedVehicle,
  totalVehiclesCount,
  latestOdo,
  latestFuelLog,
  previousFuelLog,
  latestFuelVehicle,
  customization,
  onAddFuelClick,
  onImportCsvClick,
  onCreateVehicleClick,
  onEditVehicleClick,
  onOpenCustomizeClick,
}: VehicleOdoClusterProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const palette = THEME_PRESETS[customization.theme];
  const roundedOdo = Math.max(0, Math.round(latestOdo));
  const odoDigits = String(roundedOdo).padStart(6, '0').split('');

  const tripDelta =
    latestFuelLog && previousFuelLog && latestFuelLog.odo > previousFuelLog.odo
      ? latestFuelLog.odo - previousFuelLog.odo
      : null;

  // Needle position on a 0..16 L/100km automotive semicircular cluster scale (-125deg to +125deg)
  const gaugeMax = 16;
  const consumptionVal =
    latestFuelLog?.consumption !== null && latestFuelLog?.consumption !== undefined
      ? Math.min(Math.max(latestFuelLog.consumption, 0), gaugeMax)
      : null;
  const needleAngleDeg =
    consumptionVal !== null ? -125 + (consumptionVal / gaugeMax) * 250 : -125;

  // Build radial dial tick marks
  const ticks = Array.from({ length: 17 }, (_, i) => {
    const deg = -125 + (i / 16) * 250;
    const rad = ((deg - 90) * Math.PI) / 180;
    const isMajor = i % 2 === 0;
    const rOuter = 104;
    const rInner = isMajor ? 92 : 97;
    const x1 = 140 + rInner * Math.cos(rad);
    const y1 = 122 + rInner * Math.sin(rad);
    const x2 = 140 + rOuter * Math.cos(rad);
    const y2 = 122 + rOuter * Math.sin(rad);
    const rLabel = 80;
    const lx = 140 + rLabel * Math.cos(rad);
    const ly = 122 + rLabel * Math.sin(rad);
    return { i, isMajor, x1, y1, x2, y2, lx, ly };
  });

  const needleRad = ((needleAngleDeg - 90) * Math.PI) / 180;
  const nx = 140 + 76 * Math.cos(needleRad);
  const ny = 122 + 76 * Math.sin(needleRad);

  return (
    <section
      aria-label="Đồng hồ ODO và lần đổ nhiên liệu gần nhất"
      className="grid grid-cols-1 gap-4 lg:grid-cols-12"
    >
      {/* Stylized Car Instrument Odometer Cluster */}
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-white lg:col-span-7 flex flex-col justify-between">
        {/* Top vehicle strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/90 pb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            {!imgFailed && (
              <div className="hidden sm:flex h-10 w-16 shrink-0 items-center justify-center rounded border border-slate-800 bg-slate-900 px-1.5 py-1">
                <img
                  src={`${import.meta.env.BASE_URL}assets/spark-lineart-white.png`}
                  alt=""
                  className="h-full w-full object-contain opacity-90"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-sm font-bold tracking-tight text-white">
                  {selectedVehicle
                    ? selectedVehicle.name
                    : `Đội xe (${totalVehiclesCount} phương tiện)`}
                </h2>
                {selectedVehicle?.plate && (
                  <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold tracking-wider text-amber-300">
                    {selectedVehicle.plate}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
                {selectedVehicle ? (
                  <>
                    <span>
                      {[selectedVehicle.make, selectedVehicle.model, selectedVehicle.year]
                        .filter(Boolean)
                        .join(' · ') || 'Thông số xe'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedVehicle.fuelType || 'Xăng'}</span>
                  </>
                ) : (
                  <span>Công tơ mét phương tiện đang chọn</span>
                )}
              </div>
            </div>
          </div>

          <div className="no-print flex flex-wrap items-center gap-1.5">
            {selectedVehicle && (
              <button
                type="button"
                onClick={() => onEditVehicleClick(selectedVehicle)}
                className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap"
              >
                <Pencil className="h-3 w-3" />
                Sửa xe
              </button>
            )}
            <button
              type="button"
              onClick={onImportCsvClick}
              className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap"
            >
              <Upload className="h-3 w-3" />
              Nhập CSV
            </button>
            <button
              type="button"
              onClick={onCreateVehicleClick}
              className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap"
            >
              <Plus className="h-3 w-3" />
              Tạo xe mới
            </button>
            {customization.showBlueprintBanner && (
              <button
                type="button"
                onClick={onOpenCustomizeClick}
                className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap"
                title="Tùy biến giao diện & mật khẩu"
              >
                <Palette className="h-3 w-3" />
                Tùy biến
              </button>
            )}
          </div>
        </div>

        {/* Center Automotive Instrument Dial + Digital Odometer Drum */}
        <div className="my-3 flex flex-col items-center justify-center sm:flex-row sm:items-center sm:justify-around gap-5">
          {/* SVG Dial Cluster */}
          <div className="relative w-60 shrink-0">
            <svg
              viewBox="0 0 280 185"
              className="w-full h-auto"
              role="img"
              aria-label={`Đồng hồ ODO xe hiện tại ${formatNumber(latestOdo)} km`}
            >
              {/* Outer instrument bezel */}
              <circle
                cx="140"
                cy="122"
                r="112"
                fill="#0B1220"
                stroke="#1E293B"
                strokeWidth="3"
              />
              <circle
                cx="140"
                cy="122"
                r="106"
                fill="none"
                stroke="#334155"
                strokeWidth="1"
              />

              {/* Radial speed/consumption scale ticks */}
              {ticks.map((t) => (
                <g key={t.i}>
                  <line
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                    stroke={t.i >= 12 ? '#F59E0B' : t.isMajor ? '#E2E8F0' : '#475569'}
                    strokeWidth={t.isMajor ? 2 : 1}
                    strokeLinecap="round"
                  />
                  {t.isMajor && (
                    <text
                      x={t.lx}
                      y={t.ly + 3}
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {t.i}
                    </text>
                  )}
                </g>
              ))}

              {/* Scale subtitle */}
              <text
                x="140"
                y="70"
                textAnchor="middle"
                fill="#64748B"
                fontSize="8.5"
                letterSpacing="1.2"
                fontFamily="JetBrains Mono, monospace"
              >
                L/100KM
              </text>

              {/* Instrument Needle */}
              <line
                x1="140"
                y1="122"
                x2={nx}
                y2={ny}
                stroke={palette.accentHex}
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <circle cx="140" cy="122" r="7" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.5" />
              <circle cx="140" cy="122" r="2.5" fill={palette.accentHex} />

              {/* Recessed LCD ODO Box inside instrument dial */}
              <rect
                x="62"
                y="138"
                width="156"
                height="32"
                rx="4"
                fill="#020617"
                stroke="#334155"
                strokeWidth="1.2"
              />
              <text
                x="72"
                y="158"
                fill="#64748B"
                fontSize="8.5"
                fontWeight="700"
                letterSpacing="1"
                fontFamily="JetBrains Mono, monospace"
              >
                ODO
              </text>
              <text
                x="208"
                y="158.5"
                textAnchor="end"
                fill="#F8FAFC"
                fontSize="13.5"
                fontWeight="700"
                letterSpacing="1.2"
                fontFamily="JetBrains Mono, monospace"
              >
                {roundedOdo > 0 ? `${formatNumber(latestOdo)} km` : '0 km'}
              </text>
            </svg>
          </div>

          {/* Mechanical Drum Digit Counter + Trip Summary */}
          <div className="flex flex-col items-center sm:items-start gap-3">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-slate-400">
                CÔNG TƠ MÉT HIỆN TẠI (ODO)
              </div>
              <div className="mt-1.5 flex items-center gap-1">
                {odoDigits.map((digit, idx) => (
                  <span
                    key={idx}
                    className="flex h-9 w-7 items-center justify-center rounded border border-slate-700 bg-slate-900 font-mono text-lg font-bold tabular-nums text-white"
                  >
                    {digit}
                  </span>
                ))}
                <span className="ml-1.5 font-mono text-xs font-semibold text-slate-400">km</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
              <div>
                <span className="text-slate-400">Quãng đường vừa chạy: </span>
                <span className="font-mono font-semibold tabular-nums text-amber-300">
                  {tripDelta !== null ? `+${formatNumber(tripDelta, 1)} km` : '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Tiêu hao gần nhất: </span>
                <span className="font-mono font-semibold tabular-nums text-teal-300">
                  {consumptionVal !== null ? `${formatNumber(consumptionVal, 2)} L/100km` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Refueling Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                <Fuel className="h-3.5 w-3.5" />
                <span>Lần đổ nhiên liệu gần nhất</span>
              </div>
              {latestFuelLog ? (
                <div className="mt-1 font-mono text-xs text-slate-500">
                  {formatDateDisplay(latestFuelLog.date, true)}
                  {!selectedVehicle && latestFuelVehicle
                    ? ` · ${latestFuelVehicle.name}${latestFuelVehicle.plate ? ` (${latestFuelVehicle.plate})` : ''}`
                    : ''}
                </div>
              ) : (
                <div className="mt-1 text-xs text-slate-400">Chưa có dữ liệu đổ xăng</div>
              )}
            </div>

            <button
              type="button"
              onClick={onAddFuelClick}
              className={`no-print inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 ${palette.primaryBg} ${palette.primaryHover}`}
            >
              <Plus className="h-3.5 w-3.5" />
              Đổ xăng mới
            </button>
          </div>

          {latestFuelLog ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Tổng tiền lần đổ</div>
                  <div className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
                    {formatVnd(latestFuelLog.totalCost)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-medium text-slate-500">Lượng nhiên liệu</div>
                  <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-blue-700">
                    {formatNumber(latestFuelLog.litres, 2)} lít
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-md border border-slate-100 bg-slate-50/70 p-3 text-xs">
                <div>
                  <div className="text-[11px] text-slate-500">ODO lúc đổ</div>
                  <div className="mt-0.5 font-mono font-semibold tabular-nums text-slate-900">
                    {formatNumber(latestFuelLog.odo)} km
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Giá nhiên liệu</div>
                  <div className="mt-0.5 font-mono font-semibold tabular-nums text-slate-900">
                    {formatVnd(latestFuelLog.unitPrice)}/L
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Tiêu hao bình này</div>
                  <div className="mt-0.5 font-mono font-semibold tabular-nums text-teal-700">
                    {latestFuelLog.consumption !== null
                      ? `${formatNumber(latestFuelLog.consumption, 2)} L/100km`
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Trạng thái bình</div>
                  <div className="mt-0.5 font-medium text-slate-800">
                    {latestFuelLog.full ? 'Đổ đầy bình' : 'Đổ bổ sung'}
                  </div>
                </div>
              </div>

              {latestFuelLog.notes && (
                <div className="truncate text-xs text-slate-500">
                  Ghi chú: <span className="text-slate-700">{latestFuelLog.notes}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-xs text-slate-500">
                Xe này chưa có lịch sử đổ nhiên liệu. Nhấn <strong>Đổ xăng mới</strong> để ghi nhận
                lần đầu tiên.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
