import React, { useState } from 'react';
import { Palette, Pencil, Plus, Upload } from 'lucide-react';
import { UiCustomization, Vehicle } from '../types';
import { THEME_PRESETS } from '../utils/auth';
import { formatNumber } from '../utils/format';

interface VehicleBlueprintBannerProps {
  selectedVehicle: Vehicle | null;
  totalVehiclesCount: number;
  latestOdo: number;
  customization: UiCustomization;
  onImportCsvClick: () => void;
  onCreateVehicleClick: () => void;
  onEditVehicleClick: (v: Vehicle) => void;
  onOpenCustomizeClick: () => void;
}

export function VehicleBlueprintBanner({
  selectedVehicle,
  totalVehiclesCount,
  latestOdo,
  customization,
  onImportCsvClick,
  onCreateVehicleClick,
  onEditVehicleClick,
  onOpenCustomizeClick,
}: VehicleBlueprintBannerProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!customization.showBlueprintBanner) return null;

  const palette = THEME_PRESETS[customization.theme];
  const artworkSrc =
    customization.artworkStyle === 'blue'
      ? `${import.meta.env.BASE_URL}assets/spark-lineart-blue.png`
      : `${import.meta.env.BASE_URL}assets/spark-lineart-dark.png`;

  return (
    <section
      aria-label="Hồ sơ nhận diện phương tiện"
      className="bg-blueprint-grid rounded-lg border border-slate-200 px-5 py-4"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          {!imgFailed && (
            <div className="hidden sm:flex h-20 w-32 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1">
              <img
                src={artworkSrc}
                alt={selectedVehicle ? `Hình minh họa xe ${selectedVehicle.name}` : 'Hình minh họa đội xe'}
                className="h-full w-full object-contain"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
              />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {selectedVehicle ? selectedVehicle.name : `Tổng hợp ${totalVehiclesCount} phương tiện`}
              </span>
              {selectedVehicle?.plate && (
                <span className="rounded border border-slate-300 bg-white px-2 py-0.5 font-mono text-xs font-semibold text-slate-800">
                  {selectedVehicle.plate}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-600">
              {selectedVehicle ? (
                <>
                  <span>
                    {[selectedVehicle.make, selectedVehicle.model, selectedVehicle.year]
                      .filter(Boolean)
                      .join(' · ') || 'Hồ sơ kỹ thuật phương tiện'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedVehicle.fuelType || 'Xăng'}</span>
                  {latestOdo > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums font-medium text-slate-800">
                        ODO {formatNumber(latestOdo)} km
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span>Theo dõi tổng chi phí nhiên liệu và bảo dưỡng toàn bộ đội xe</span>
              )}
            </div>
          </div>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2 shrink-0">
          {selectedVehicle && (
            <button
              type="button"
              onClick={() => onEditVehicleClick(selectedVehicle)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              <Pencil className="h-3.5 w-3.5 text-slate-500" />
              Sửa xe
            </button>
          )}
          <button
            type="button"
            onClick={onImportCsvClick}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5 text-slate-500" />
            Nhập CSV
          </button>
          <button
            type="button"
            onClick={onCreateVehicleClick}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors whitespace-nowrap ${palette.primaryBg} ${palette.primaryHover}`}
          >
            <Plus className="h-3.5 w-3.5" />
            Tạo xe mới
          </button>
          <button
            type="button"
            onClick={onOpenCustomizeClick}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            title="Tùy biến giao diện & tài khoản"
          >
            <Palette className="h-3.5 w-3.5 text-slate-500" />
            Tùy biến
          </button>
        </div>
      </div>
    </section>
  );
}
