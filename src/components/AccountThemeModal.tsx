import React, { useState } from 'react';
import { Check, KeyRound, Palette, RotateCcw, ShieldCheck, UserPlus, X } from 'lucide-react';
import {
  AccountRecord,
  SessionUser,
  ThemePresetId,
  UiCustomization,
  Vehicle,
} from '../types';
import {
  ADMIN_DEFAULT_PASSWORD,
  ADMIN_USERNAME,
  DEFAULT_PASSWORD,
  formatPlateDisplay,
  isVehicleOwnedByAccount,
  normalizeAccountKey,
  THEME_PRESETS,
} from '../utils/auth';

interface AccountThemeModalProps {
  open: boolean;
  onClose: () => void;
  session: SessionUser;
  accounts: AccountRecord[];
  vehicles: Vehicle[];
  customization: UiCustomization;
  onChangeCustomization: (next: UiCustomization) => void;
  onChangePassword: (currentPwd: string, newPwd: string) => string | null;
  onResetAccountPassword: (usernameKey: string) => void;
  onCreatePlateAccount: (plate: string) => string | null;
}

export function AccountThemeModal({
  open,
  onClose,
  session,
  accounts,
  vehicles,
  customization,
  onChangeCustomization,
  onChangePassword,
  onResetAccountPassword,
  onCreatePlateAccount,
}: AccountThemeModalProps) {
  const [tab, setTab] = useState<'theme' | 'password' | 'admin'>('theme');

  // Change password fields
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMessage, setPwdMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  // Admin add plate account
  const [newPlateInput, setNewPlateInput] = useState('');
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  if (!open) return null;

  const isAdmin = session.role === 'admin';
  const palette = THEME_PRESETS[customization.theme];

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);
    if (newPwd.length < 4) {
      setPwdMessage({ type: 'err', text: 'Mật khẩu mới cần ít nhất 4 ký tự.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMessage({ type: 'err', text: 'Xác nhận mật khẩu mới không khớp.' });
      return;
    }
    const err = onChangePassword(currentPwd, newPwd);
    if (err) {
      setPwdMessage({ type: 'err', text: err });
    } else {
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdMessage({ type: 'ok', text: 'Đã cập nhật mật khẩu mới thành công.' });
    }
  };

  const handleAddPlateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = onCreatePlateAccount(newPlateInput);
    if (err) {
      setAdminMessage(err);
    } else {
      setAdminMessage(
        `Đã tạo tài khoản biển số ${formatPlateDisplay(newPlateInput)} (mật khẩu mặc định: ${DEFAULT_PASSWORD}).`
      );
      setNewPlateInput('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-theme-modal-title"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="account-theme-modal-title"
              className="text-base font-semibold text-slate-900"
            >
              Tài khoản &amp; Tùy biến giao diện
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Đang đăng nhập:{' '}
              <span className="font-mono font-semibold text-slate-800">
                {session.displayUsername}
              </span>{' '}
              ({isAdmin ? 'Quản trị viên' : 'Tài khoản biển số xe'})
            </p>
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

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-2.5">
          <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setTab('theme')}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === 'theme'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              Tùy biến giao diện &amp; Hình xe
            </button>

            <button
              type="button"
              onClick={() => setTab('password')}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === 'password'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Đổi mật khẩu
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setTab('admin')}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === 'admin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Quản trị biển số ({accounts.length})
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {tab === 'theme' && (
            <div className="space-y-6">
              {/* Theme palette selection */}
              <div>
                <h3 className="text-xs font-semibold text-slate-700">
                  Bảng màu nhận diện giao diện
                </h3>
                <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(Object.keys(THEME_PRESETS) as ThemePresetId[]).map((presetKey) => {
                    const p = THEME_PRESETS[presetKey];
                    const active = customization.theme === presetKey;
                    return (
                      <button
                        key={presetKey}
                        type="button"
                        onClick={() =>
                          onChangeCustomization({ ...customization, theme: presetKey })
                        }
                        className={`rounded-lg border p-3.5 text-left transition-colors ${
                          active
                            ? 'border-blue-600 bg-blue-50/40'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-4 w-4 rounded-sm border border-black/10"
                              style={{ backgroundColor: p.swatchHex }}
                            />
                            <span
                              className="h-4 w-4 rounded-sm border border-black/10"
                              style={{ backgroundColor: p.accentHex }}
                            />
                          </div>
                          {active && <Check className="h-4 w-4 text-blue-700" />}
                        </div>
                        <div className="mt-2.5 text-xs font-semibold text-slate-900">{p.name}</div>
                        <div className="mt-0.5 text-[11px] leading-snug text-slate-500">
                          {p.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Spark Line-art customization */}
              <div>
                <h3 className="text-xs font-semibold text-slate-700">
                  Phong cách hình minh họa Spark (từ ảnh đã nhập)
                </h3>
                <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeCustomization({ ...customization, artworkStyle: 'dark' })
                    }
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      customization.artworkStyle === 'dark'
                        ? 'border-blue-600 bg-blue-50/40'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="bg-blueprint-grid flex h-14 w-20 shrink-0 items-center justify-center rounded border border-slate-200 p-1">
                      <img
                        src="/assets/spark-lineart-dark.png"
                        alt="Nét mực than"
                        className="h-full w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Nét mực chì kỹ thuật</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        Nét nguyên bản tách nền trong suốt trên lưới bản vẽ
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onChangeCustomization({ ...customization, artworkStyle: 'blue' })
                    }
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      customization.artworkStyle === 'blue'
                        ? 'border-blue-600 bg-blue-50/40'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="bg-blueprint-grid flex h-14 w-20 shrink-0 items-center justify-center rounded border border-slate-200 p-1">
                      <img
                        src="/assets/spark-lineart-blue.png"
                        alt="Nét xanh bản vẽ"
                        className="h-full w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Nét xanh Blueprint</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        Chuyển tông xanh dương đồng bộ với biểu tượng ứng dụng
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Hiển thị khung bản vẽ nhận diện xe trên màn hình chính
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Bật/tắt thanh hồ sơ kỹ thuật kèm hình vẽ xe phía trên báo cáo
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={customization.showBlueprintBanner}
                  onChange={(e) =>
                    onChangeCustomization({
                      ...customization,
                      showBlueprintBanner: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
              </label>
            </div>
          )}

          {tab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
              {pwdMessage && (
                <div
                  className={`rounded-md border px-3.5 py-2.5 text-xs font-medium ${
                    pwdMessage.type === 'ok'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {pwdMessage.text}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Mặc định ban đầu: 123456"
                  required
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  required
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className={`rounded-md px-4 py-2 text-xs font-semibold text-white transition-colors ${palette.primaryBg} ${palette.primaryHover}`}
              >
                Lưu mật khẩu mới
              </button>
            </form>
          )}

          {tab === 'admin' && isAdmin && (
            <div className="space-y-5">
              <form onSubmit={handleAddPlateSubmit} className="flex flex-wrap items-end gap-2.5">
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Cấp tài khoản biển số xe mới (mật khẩu mặc định 123456)
                  </label>
                  <input
                    type="text"
                    value={newPlateInput}
                    onChange={(e) => setNewPlateInput(e.target.value)}
                    placeholder="Ví dụ: 30H-456.78"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap ${palette.primaryBg} ${palette.primaryHover}`}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Tạo tài khoản biển số
                </button>
              </form>

              {adminMessage && (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-medium text-blue-800">
                  {adminMessage}
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                      <th className="px-4 py-2.5">Tài khoản</th>
                      <th className="px-4 py-2.5">Vai trò</th>
                      <th className="px-4 py-2.5 text-right">Số xe quản lý</th>
                      <th className="px-4 py-2.5">Mật khẩu hiện tại</th>
                      <th className="px-4 py-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map((acc) => {
                      const ownedCount =
                        acc.role === 'admin'
                          ? vehicles.length
                          : vehicles.filter((v) =>
                              isVehicleOwnedByAccount(v, acc.usernameKey)
                            ).length;
                      const isSelfAdmin =
                        normalizeAccountKey(acc.usernameKey) === ADMIN_USERNAME;

                      return (
                        <tr key={acc.usernameKey} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                            {acc.displayUsername}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">
                            {acc.role === 'admin' ? 'Quản trị viên' : 'Biển số xe'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                            {ownedCount}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-500">
                            {isSelfAdmin
                              ? acc.password === ADMIN_DEFAULT_PASSWORD
                                ? 'Mặc định'
                                : 'Đã đổi'
                              : acc.password === DEFAULT_PASSWORD
                                ? '123456 (Mặc định)'
                                : 'Đã đổi'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {!isSelfAdmin && acc.password !== DEFAULT_PASSWORD ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onResetAccountPassword(acc.usernameKey);
                                  setAdminMessage(
                                    `Đã đặt lại mật khẩu của ${acc.displayUsername} về 123456.`
                                  );
                                }}
                                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Đặt lại 123456
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50/60 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
}
