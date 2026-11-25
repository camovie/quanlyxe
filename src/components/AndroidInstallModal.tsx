import React, { useState } from 'react';
import { Check, Copy, Download, Smartphone, Terminal, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidInstallModalProps {
  open: boolean;
  onClose: () => void;
}

const BUILD_COMMANDS = `npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug`;

export function AndroidInstallModal({ open, onClose }: AndroidInstallModalProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(BUILD_COMMANDS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="android-install-title"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Smartphone className="h-4 w-4 text-blue-700" />
            <h2 id="android-install-title" className="text-base font-semibold text-slate-900">
              Cài đặt Sổ Xe Offline lên Android & Xuất APK
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Đóng hộp thoại"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[78vh] space-y-5 overflow-y-auto p-6 text-sm text-slate-700">
          {/* Option 1: Direct PWA Install */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-blue-700">
              Cách 1 · Cài trực tiếp lên điện thoại ngay lập tức (Offline 100%)
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Ứng dụng đã tích hợp Service Worker lưu toàn bộ mã nguồn và dữ liệu gốc vào bộ nhớ
              máy. Sau khi cài, bạn mở từ màn hình chính toàn màn hình như ứng dụng Android và sử
              dụng hoàn toàn không cần mạng.
            </p>

            {isInstalled ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
                Ứng dụng đang chạy ở chế độ cài đặt độc lập (Standalone Offline).
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                onClick={async () => {
                  const ok = await install();
                  if (ok) onClose();
                }}
                className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
              >
                <Download className="h-4 w-4" />
                Cài đặt ngay lên điện thoại
              </button>
            ) : isIOS ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                Trên Safari iPhone/iPad: Nhấn nút <strong>Chia sẻ (Share)</strong> ở thanh dưới →
                chọn <strong>Thêm vào Màn hình chính (Add to Home Screen)</strong>.
              </div>
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                Mở link ứng dụng trên <strong>Google Chrome (Android)</strong> → chạm biểu tượng{' '}
                <strong>⋮</strong> ở góc trên bên phải → chọn{' '}
                <strong>Cài đặt ứng dụng / Thêm vào màn hình chính</strong>.
              </div>
            )}
          </div>

          <div className="border-t border-slate-200" />

          {/* Option 2: Standalone APK via Capacitor Android Project */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-900">
              Cách 2 · Xuất file .APK độc lập từ dự án Android Capacitor tích hợp sẵn
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Thư mục dự án Android gốc (<code className="font-mono text-slate-900">android/</code>
              ), cấu hình <code className="font-mono text-slate-900">capacitor.config.ts</code> và
              workflow đóng gói tự động{' '}
              <code className="font-mono text-slate-900">
                .github/workflows/build-android-apk.yml
              </code>{' '}
              đã được tạo sẵn cùng toàn bộ tài nguyên offline.
            </p>

            <div className="space-y-2 text-xs text-slate-600">
              <div>
                <strong className="text-slate-900">Đóng gói APK không cần Android Studio:</strong>{' '}
                Đẩy mã nguồn lên GitHub → mở tab <strong>Actions</strong> → chạy{' '}
                <strong>Build Android APK (Offline)</strong> → tải file{' '}
                <code className="font-mono text-slate-900">app-debug.apk</code> về chép vào máy
                Android cài đặt.
              </div>
              <div>
                <strong className="text-slate-900">Hoặc build trực tiếp trên máy tính:</strong> (yêu
                cầu Node.js 20+, JDK 21, Android SDK)
              </div>
            </div>

            <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-900 text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1.5 font-mono">
                  <Terminal className="h-3.5 w-3.5" />
                  android/app/build/outputs/apk/debug/app-debug.apk
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      Đã chép
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Chép lệnh
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed">
                {BUILD_COMMANDS}
              </pre>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50/60 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
