import React, { useRef } from 'react';
import { Car, Plus, Upload, X } from 'lucide-react';
import { SessionUser, UiCustomization } from '../types';
import { THEME_PRESETS } from '../utils/auth';

interface PostLoginSetupProps {
  session: SessionUser;
  hasVehicles: boolean;
  customization: UiCustomization;
  onImportCsvFile: (file: File) => void;
  onCreateNewVehicle: () => void;
  onDismiss?: () => void;
}

export function PostLoginSetup({
  session,
  hasVehicles,
  customization,
  onImportCsvFile,
  onCreateNewVehicle,
  onDismiss,
}: PostLoginSetupProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const palette = THEME_PRESETS[customization.theme];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportCsvFile(file);
      e.target.value = '';
    }
  };

  if (!hasVehicles) {
    // Full dedicated onboarding card when a newly logged-in plate has no vehicle yet
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-28 items-center justify-center rounded-lg border border-slate-200 bg-blueprint-grid p-2">
            <img
              src={
                customization.artworkStyle === 'blue'
                  ? '/assets/spark-lineart-blue.png'
                  : '/assets/spark-lineart-dark.png'
              }
              alt="Minh họa phương tiện"
              className="h-full w-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
            Tài khoản <span className="font-mono">{session.displayUsername}</span> đã sẵn sàng
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Hãy chọn nhập dữ liệu có sẵn từ tệp CSV (Fuelio) hoặc tạo mới thông tin xe để bắt đầu
            lập báo cáo nhiên liệu và bảo dưỡng.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/60 p-5 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
            >
              <div>
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-blue-700">
                  <Upload className="h-4 w-4" />
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-900">
                  Nhập xe từ file CSV
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Nạp toàn bộ lịch sử đổ xăng, ODO và các lần bảo dưỡng sửa chữa từ tệp Fuelio CSV.
                </p>
              </div>
              <div className="mt-4 text-xs font-semibold text-blue-700">
                Chọn tệp .csv trên máy &rarr;
              </div>
            </button>

            <button
              type="button"
              onClick={onCreateNewVehicle}
              className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/60 p-5 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
            >
              <div>
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-amber-600">
                  <Car className="h-4 w-4" />
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-900">
                  Tạo mới xe
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Khởi tạo hồ sơ xe mới với biển số <span className="font-mono font-medium text-slate-700">{session.displayUsername}</span> để bắt đầu ghi nhận từng lần đổ xăng.
                </p>
              </div>
              <div className="mt-4 text-xs font-semibold text-amber-700">
                Điền thông tin xe mới &rarr;
              </div>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Compact post-login quick setup bar when the user already has vehicles
  return (
    <section
      aria-label="Tác vụ xe sau khi đăng nhập"
      className={`no-print flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${palette.softBorder} ${palette.softBg}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="min-w-0 text-xs text-slate-700">
        <span className="font-semibold text-slate-900">
          Xin chào {session.role === 'admin' ? `Quản trị viên ${session.displayUsername}` : `Biển số ${session.displayUsername}`}
        </span>
        <span className="mx-2 text-slate-300" aria-hidden="true">
          ·
        </span>
        <span>Bạn có thể nhập thêm file xe CSV hoặc tạo mới xe bất cứ lúc nào.</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
        >
          <Upload className="h-3.5 w-3.5 text-slate-600" />
          Nhập xe (CSV)
        </button>

        <button
          type="button"
          onClick={onCreateNewVehicle}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors whitespace-nowrap ${palette.primaryBg} ${palette.primaryHover}`}
        >
          <Plus className="h-3.5 w-3.5" />
          Tạo mới xe
        </button>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded p-1 text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-900"
            aria-label="Ẩn thanh tác vụ sau đăng nhập"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </section>
  );
}
