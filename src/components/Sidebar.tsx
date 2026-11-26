import React, { useRef, useState } from 'react';
import {
  BarChart3,
  Car,
  Download,
  FolderSync,
  Fuel,
  LogOut,
  Palette,
  Pencil,
  Plus,
  Printer,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { ReportScope, SessionUser, UiCustomization, Vehicle } from '../types';
import { THEME_PRESETS } from '../utils/auth';
import { formatNumber } from '../utils/format';
import { SparkBrandMark } from './SparkBrandMark';

interface SidebarProps {
  session: SessionUser;
  customization: UiCustomization;
  vehicles: Vehicle[];
  selectedVehicleId: string;
  onSelectVehicle: (id: string) => void;
  reportScope: ReportScope;
  onSelectScope: (scope: ReportScope) => void;
  latestOdoByVehicle: Record<string, number>;
  countsByVehicle: Record<string, { fuel: number; maintenance: number }>;
  onAddVehicleClick: () => void;
  onEditVehicleClick: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onImportCsvFile: (file: File) => void;
  onExportCsv: () => void;
  onPrintReport: () => void;
  onOpenAndroidInstall: () => void;
  onOpenAccountThemeModal: () => void;
  fileSyncLinked: boolean;
  hasUnsyncedChanges: boolean;
  onOpenFileSync: () => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  session,
  customization,
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  reportScope,
  onSelectScope,
  latestOdoByVehicle,
  countsByVehicle,
  onAddVehicleClick,
  onEditVehicleClick,
  onDeleteVehicle,
  onImportCsvFile,
  onExportCsv,
  onPrintReport,
  onOpenAndroidInstall,
  onOpenAccountThemeModal,
  fileSyncLinked,
  hasUnsyncedChanges,
  onOpenFileSync,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const palette = THEME_PRESETS[customization.theme];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportCsvFile(file);
      e.target.value = '';
    }
  };

  const navItems: Array<{ id: ReportScope; label: string; icon: React.ReactNode }> = [
    {
      id: 'overview',
      label: 'Tổng quan báo cáo',
      icon: <BarChart3 className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'fuel',
      label: 'Báo cáo nhiên liệu',
      icon: <Fuel className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'maintenance',
      label: 'Bảo dưỡng & Sửa chữa',
      icon: <Wrench className="h-4 w-4 shrink-0" />,
    },
  ];

  const totalFuelAll = Object.values(countsByVehicle).reduce((s, c) => s + c.fuel, 0);
  const totalMaintAll = Object.values(countsByVehicle).reduce((s, c) => s + c.maintenance, 0);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      {/* Brand Header with Customized Spark Emblem */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <SparkBrandMark size="sm" theme={customization.theme} />
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Sổ Xe
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Đóng thanh điều hướng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Logged-in Account Strip */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-3.5 py-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700">
              {session.role === 'admin' ? (
                <ShieldCheck className={`h-3.5 w-3.5 ${palette.primaryText}`} />
              ) : (
                <User className={`h-3.5 w-3.5 ${palette.primaryText}`} />
              )}
            </span>
            <div className="min-w-0">
              <div className="truncate font-mono text-xs font-bold text-slate-900">
                {session.displayUsername}
              </div>
              <div className="truncate text-[11px] text-slate-500">
                {session.role === 'admin' ? 'Quản trị viên' : 'Tài khoản biển số'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onOpenAccountThemeModal();
            onCloseMobile();
          }}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap"
        >
          <Palette className="h-3 w-3 text-slate-500 shrink-0" />
          Tùy biến giao diện &amp; Mật khẩu
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Report Views */}
        <div>
          <div className="px-2.5 pb-2 text-xs font-semibold text-slate-500">
            Loại báo cáo
          </div>
          <nav className="space-y-0.5" aria-label="Điều hướng báo cáo">
            {navItems.map((item) => {
              const active = reportScope === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectScope(item.id);
                    onCloseMobile();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? `${palette.softBg} text-slate-900 font-semibold`
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className={active ? palette.primaryText : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Vehicle Switcher */}
        <div>
          <div className="flex items-center justify-between px-2.5 pb-2">
            <span className="text-xs font-semibold text-slate-500">
              Chọn phương tiện ({vehicles.length})
            </span>
            <button
              type="button"
              onClick={() => {
                onAddVehicleClick();
                onCloseMobile();
              }}
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors hover:bg-slate-100 whitespace-nowrap ${palette.primaryText}`}
              title="Thêm xe mới"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm xe
            </button>
          </div>

          {vehicles.length === 0 ? (
            <div className="mx-1 rounded-md border border-dashed border-slate-300 bg-slate-50/70 px-3 py-3 text-xs text-slate-500">
              Chưa có phương tiện nào cho tài khoản này. Hãy bấm{' '}
              <span className="font-semibold text-slate-700">Thêm xe</span> hoặc{' '}
              <span className="font-semibold text-slate-700">Nhập file CSV</span> bên dưới.
            </div>
          ) : (
            <div className="space-y-1">
              {/* All vehicles aggregate option */}
              {(vehicles.length > 1 || session.role === 'admin') && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectVehicle('all');
                      onCloseMobile();
                    }}
                    className={`w-full rounded-md px-2.5 py-2 text-left transition-colors ${
                      selectedVehicleId === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">Tất cả xe</span>
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          selectedVehicleId === 'all' ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {vehicles.length} xe
                      </span>
                    </div>
                    <div
                      className={`mt-0.5 text-[11px] font-mono tabular-nums ${
                        selectedVehicleId === 'all' ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {totalFuelAll} lần xăng · {totalMaintAll} bảo dưỡng
                    </div>
                  </button>

                  <div className="my-2 border-t border-slate-100" />
                </>
              )}

              {/* Individual vehicles */}
              {vehicles.map((vehicle) => {
                const isSelected = selectedVehicleId === vehicle.id;
                const odo = latestOdoByVehicle[vehicle.id] ?? 0;
                const counts = countsByVehicle[vehicle.id] ?? { fuel: 0, maintenance: 0 };
                const isConfirming = confirmDeleteId === vehicle.id;
                const canDelete = vehicles.length > 1 || session.role === 'user';

                return (
                  <div
                    key={vehicle.id}
                    className={`group rounded-md border transition-colors ${
                      isSelected
                        ? `${palette.softBorder} ${palette.softBg}`
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 px-2.5 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectVehicle(vehicle.id);
                          onCloseMobile();
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-1.5">
                          <Car
                            className={`h-3.5 w-3.5 shrink-0 ${
                              isSelected ? palette.primaryText : 'text-slate-400'
                            }`}
                          />
                          <span
                            className={`truncate text-sm font-semibold ${
                              isSelected ? 'text-slate-950' : 'text-slate-800'
                            }`}
                          >
                            {vehicle.name}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500">
                          <span className="font-mono tabular-nums">
                            {odo > 0 ? `${formatNumber(odo)} km` : 'Chưa có ODO'}
                          </span>
                          {vehicle.plate && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{vehicle.plate}</span>
                            </>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {counts.fuel} xăng · {counts.maintenance} bảo dưỡng
                          {vehicle.source === 'sample' ? ' · Mẫu' : ''}
                        </div>
                      </button>

                      <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditVehicleClick(vehicle)}
                          className="rounded p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
                          title="Sửa thông tin xe"
                          aria-label={`Sửa xe ${vehicle.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteId(isConfirming ? null : vehicle.id)
                            }
                            className="rounded p-1 text-slate-400 transition-colors hover:bg-white hover:text-red-600"
                            title="Xóa xe"
                            aria-label={`Xóa xe ${vehicle.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isConfirming && (
                      <div className="flex items-center justify-between gap-2 border-t border-red-100 bg-red-50/70 px-2.5 py-1.5 text-xs">
                        <span className="text-red-700 font-medium">Xóa xe này?</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded px-2 py-0.5 text-slate-600 hover:bg-white"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteVehicle(vehicle.id);
                              setConfirmDeleteId(null);
                            }}
                            className="rounded bg-red-600 px-2 py-0.5 font-medium text-white hover:bg-red-700"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Data Actions */}
      <div className="border-t border-slate-200 p-3 space-y-1.5 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap"
        >
          <Upload className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          Nhập file CSV (Fuelio)
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={onExportCsv}
            disabled={!selectedVehicleId || selectedVehicleId === 'all'}
            title={
              !selectedVehicleId || selectedVehicleId === 'all'
                ? 'Hãy chọn một xe cụ thể để xuất file CSV'
                : 'Xuất dữ liệu xe hiện tại ra file CSV'
            }
            className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            Xuất CSV
          </button>
          <button
            type="button"
            onClick={onPrintReport}
            disabled={vehicles.length === 0}
            className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            In báo cáo
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onOpenFileSync();
            onCloseMobile();
          }}
          className="flex w-full items-center justify-between gap-2 rounded-md border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-100/70 whitespace-nowrap"
        >
          <span className="flex items-center gap-2 min-w-0">
            <FolderSync className="h-3.5 w-3.5 text-blue-700 shrink-0" />
            <span className="truncate">Đồng bộ File đa thiết bị</span>
          </span>
          <span className="font-mono text-[10px] font-medium shrink-0">
            {hasUnsyncedChanges ? 'Chưa lưu' : fileSyncLinked ? 'Đã gắn' : 'Mở'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenAndroidInstall();
            onCloseMobile();
          }}
          className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${palette.softBorder} ${palette.softBg} ${palette.primaryText}`}
        >
          <Smartphone className="h-3.5 w-3.5 shrink-0" />
          Cài Android Offline / APK
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw]">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
}
