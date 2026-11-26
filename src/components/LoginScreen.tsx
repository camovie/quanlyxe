import React, { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { AccountRecord, UiCustomization, Vehicle } from '../types';
import { THEME_PRESETS } from '../utils/auth';
import { SparkBrandMark } from './SparkBrandMark';

interface LoginScreenProps {
  accounts: AccountRecord[];
  vehicles: Vehicle[];
  customization: UiCustomization;
  onLogin: (usernameInput: string, passwordInput: string) => string | null;
}

export function LoginScreen({ customization, onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const palette = THEME_PRESETS[customization.theme];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = onLogin(username, password);
    if (err) {
      setError(err);
    } else {
      setError(null);
    }
  };

  return (
    <div className="bg-blueprint-grid flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-900">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-7 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <SparkBrandMark size="lg" theme={customization.theme} />
          <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
            Chào mừng
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="login-username" className="sr-only">
              Nhập biển số xe
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Nhập biển số xe"
              autoComplete="username"
              autoFocus
              className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="sr-only">
              Mật khẩu mặc định 123456
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Mật khẩu mặc định 123456"
                autoComplete="current-password"
                className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-3.5 pr-10 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors ${palette.primaryBg} ${palette.primaryHover}`}
          >
            <LogIn className="h-4 w-4" />
            Đăng nhập
          </button>
        </form>
      </div>
    </div>
  );
}
