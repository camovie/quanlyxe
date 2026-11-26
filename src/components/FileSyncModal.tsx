import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  Download,
  FileJson,
  FolderOpen,
  FolderSync,
  GitMerge,
  Link2Off,
  Loader2,
  Plus,
  RefreshCw,
  Share2,
  X,
} from 'lucide-react';
import { UiCustomization } from '../types';
import { THEME_PRESETS } from '../utils/auth';
import {
  canShareSyncFile,
  downloadSyncFile,
  FleetSyncData,
  isDirectFileSyncSupported,
  mergeSyncData,
  ParsedSyncFile,
  parseSyncFileText,
  pickOpenSyncFileHandle,
  pickSaveSyncFileHandle,
  readSyncFileFromHandle,
  shareSyncFile,
  SYNC_FILE_NAME,
  SyncFileSystemHandle,
  writeSyncFileToHandle,
} from '../utils/fileSync';

interface FileSyncModalProps {
  open: boolean;
  onClose: () => void;
  localData: FleetSyncData;
  customization: UiCustomization;
  lastSyncAt: number | null;
  hasUnsyncedChanges: boolean;
  linkedHandle: SyncFileSystemHandle | null;
  autoWriteLinkedFile: boolean;
  onToggleAutoWrite: (enabled: boolean) => void;
  onSetLinkedHandle: (handle: SyncFileSystemHandle | null) => void;
  onApplySyncedData: (data: FleetSyncData, message: string) => void;
  onMarkSynced: () => void;
}

type PendingOverwrite =
  | { type: 'replace_local'; file: ParsedSyncFile }
  | { type: 'overwrite_linked_file'; handle: SyncFileSystemHandle };

export function FileSyncModal({
  open,
  onClose,
  localData,
  customization,
  lastSyncAt,
  hasUnsyncedChanges,
  linkedHandle,
  autoWriteLinkedFile,
  onToggleAutoWrite,
  onSetLinkedHandle,
  onApplySyncedData,
  onMarkSynced,
}: FileSyncModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewFile, setPreviewFile] = useState<ParsedSyncFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [pendingOverwrite, setPendingOverwrite] = useState<PendingOverwrite | null>(null);

  if (!open) return null;

  const palette = THEME_PRESETS[customization.theme];
  const directSupported = isDirectFileSyncSupported();
  const shareSupported = canShareSyncFile();

  const handleDownloadFile = () => {
    setErrorMsg(null);
    downloadSyncFile(localData, SYNC_FILE_NAME);
    onMarkSynced();
    setStatusMsg(
      `Đã lưu file "${SYNC_FILE_NAME}". Hãy đưa file này lên Google Drive, OneDrive hoặc Zalo Cloud để đồng bộ sang máy khác.`
    );
  };

  const handleShareFile = async () => {
    setBusy(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const outcome = await shareSyncFile(localData);
      if (outcome === 'shared') {
        onMarkSynced();
        setStatusMsg(`Đã gửi file "${SYNC_FILE_NAME}" thành công.`);
      }
    } catch {
      downloadSyncFile(localData, SYNC_FILE_NAME);
      onMarkSynced();
      setStatusMsg(`Đã tải file "${SYNC_FILE_NAME}" về máy để bạn tải lên Drive hoặc Zalo.`);
    } finally {
      setBusy(false);
    }
  };

  const handlePickedStandardFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg(null);
    setStatusMsg(null);
    setPendingOverwrite(null);
    try {
      const text = await file.text();
      const parsed = parseSyncFileText(text);
      setPreviewFile({
        fileName: file.name,
        exportedAt: parsed.exportedAt,
        data: parsed.data,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không đọc được file đồng bộ.');
    }
  };

  const handleCreateLinkedFile = async () => {
    setBusy(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const handle = await pickSaveSyncFileHandle();
      if (!handle) return;
      await writeSyncFileToHandle(handle, localData);
      onSetLinkedHandle(handle);
      onMarkSynced();
      setStatusMsg(
        `Đã tạo và gắn trực tiếp file "${handle.name}". Mọi lần lưu tiếp theo chỉ cần ghi cập nhật vào đúng file này.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tạo file đồng bộ trực tiếp.');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenAndLinkFile = async () => {
    setBusy(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const handle = await pickOpenSyncFileHandle();
      if (!handle) return;
      const parsed = await readSyncFileFromHandle(handle);
      onSetLinkedHandle(handle);
      setPreviewFile(parsed);
      setStatusMsg(
        `Đã gắn file "${parsed.fileName}". Hãy chọn "Gộp 2 chiều" hoặc "Thay thế bằng file này" bên dưới.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể mở file đã chọn.');
    } finally {
      setBusy(false);
    }
  };

  const handleReadLinkedNow = async () => {
    if (!linkedHandle) return;
    setBusy(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const parsed = await readSyncFileFromHandle(linkedHandle);
      setPreviewFile(parsed);
      setStatusMsg(`Đã đọc dữ liệu mới nhất từ "${parsed.fileName}".`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không đọc được file đã gắn.');
    } finally {
      setBusy(false);
    }
  };

  const handleMergePreview = async () => {
    if (!previewFile) return;
    const merged = mergeSyncData(localData, previewFile.data);
    onApplySyncedData(merged, 'Đã gộp dữ liệu 2 chiều từ file.');

    // If a direct desktop handle is active, also keep the linked file up to date automatically after merge
    if (linkedHandle && previewFile.fileName === linkedHandle.name) {
      try {
        await writeSyncFileToHandle(linkedHandle, merged);
      } catch {
        // Ignore if user didn't grant write yet
      }
    }

    onMarkSynced();
    setPreviewFile(null);
    setPendingOverwrite(null);
    setStatusMsg('Đã gộp dữ liệu từ 2 thiết bị thành công, không làm mất bản ghi nào.');
  };

  const executeConfirmedOverwrite = async () => {
    if (!pendingOverwrite) return;
    setBusy(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      if (pendingOverwrite.type === 'replace_local') {
        onApplySyncedData(
          pendingOverwrite.file.data,
          `Đã khôi phục dữ liệu từ file "${pendingOverwrite.file.fileName}".`
        );
        onMarkSynced();
        setPreviewFile(null);
        setStatusMsg(`Đã cập nhật toàn bộ máy theo file "${pendingOverwrite.file.fileName}".`);
      } else if (pendingOverwrite.type === 'overwrite_linked_file') {
        await writeSyncFileToHandle(pendingOverwrite.handle, localData);
        onMarkSynced();
        setStatusMsg(`Đã ghi dữ liệu mới nhất lên file "${pendingOverwrite.handle.name}".`);
      }
      setPendingOverwrite(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Thao tác ghi file thất bại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-sync-modal-title"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-700">
              <FolderSync className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 id="file-sync-modal-title" className="text-base font-semibold text-slate-900">
                Đồng bộ dữ liệu qua File (Miễn phí 100%)
              </h2>
              <p className="text-xs text-slate-500">
                Lưu toàn bộ xe, xăng, bảo dưỡng &amp; tài khoản vào 1 file{' '}
                <code className="font-mono font-semibold text-slate-700">{SYNC_FILE_NAME}</code>{' '}
                để đồng bộ qua Google Drive, OneDrive, iCloud hoặc Zalo Cloud
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Đóng hộp thoại đồng bộ file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[76vh] overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          {statusMsg && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
              <Check className="h-4 w-4 shrink-0 text-emerald-700" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Confirmation alertdialog before any overwrite */}
          {pendingOverwrite && (
            <div
              role="alertdialog"
              aria-labelledby="overwrite-confirm-title"
              className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div className="text-xs text-amber-950 space-y-1">
                  <div id="overwrite-confirm-title" className="text-sm font-bold">
                    {pendingOverwrite.type === 'replace_local'
                      ? 'Xác nhận thay thế toàn bộ dữ liệu trên máy?'
                      : `Xác nhận ghi đè file "${pendingOverwrite.handle.name}"?`}
                  </div>
                  {pendingOverwrite.type === 'replace_local' ? (
                    <p>
                      Dữ liệu hiện tại trên thiết bị sẽ được thay thế hoàn toàn bằng nội dung file{' '}
                      <strong>&ldquo;{pendingOverwrite.file.fileName}&rdquo;</strong> (
                      {pendingOverwrite.file.data.vehicles.length} xe,{' '}
                      {pendingOverwrite.file.data.fuelLogs.length} lần đổ xăng,{' '}
                      {pendingOverwrite.file.data.maintenanceLogs.length} bảo dưỡng).
                    </p>
                  ) : (
                    <p>
                      File <strong>&ldquo;{pendingOverwrite.handle.name}&rdquo;</strong> sẽ được
                      cập nhật theo toàn bộ dữ liệu hiện tại trên máy ({localData.vehicles.length}{' '}
                      xe, {localData.fuelLogs.length} lần đổ xăng,{' '}
                      {localData.maintenanceLogs.length} bảo dưỡng).
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPendingOverwrite(null)}
                  className="rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void executeConfirmedOverwrite()}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold text-white ${palette.primaryBg} ${palette.primaryHover}`}
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Xác nhận thực hiện
                </button>
              </div>
            </div>
          )}

          {/* Local status overview */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs">
            <div>
              <div className="font-semibold text-slate-800">Dữ liệu hiện tại trên thiết bị</div>
              <div className="mt-0.5 font-mono tabular-nums text-slate-600">
                {localData.vehicles.length} xe · {localData.fuelLogs.length} đổ xăng ·{' '}
                {localData.maintenanceLogs.length} bảo dưỡng · {localData.accounts.length} tài khoản
              </div>
            </div>
            <div className="text-right font-mono text-[11px]">
              {hasUnsyncedChanges ? (
                <span className="font-semibold text-amber-700">Có thay đổi chưa xuất file</span>
              ) : lastSyncAt ? (
                <span className="text-slate-500">
                  Lưu gần nhất: {new Date(lastSyncAt).toLocaleString('vi-VN')}
                </span>
              ) : (
                <span className="text-slate-400">Chưa xuất file đồng bộ</span>
              )}
            </div>
          </div>

          {/* Section 1: Universal File Export/Share & Import/Merge (Works on Android APK + Phone + PC) */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-3.5">
            <div>
              <div className="text-xs font-semibold text-slate-800">
                1. Chia sẻ / Tải file đồng bộ đa thiết bị (Điện thoại &amp; Máy tính)
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Không cần đăng ký tài khoản API hay trả phí. Lưu file{' '}
                <span className="font-mono">{SYNC_FILE_NAME}</span> vào Google Drive, OneDrive hoặc
                Zalo &ldquo;Cloud của tôi&rdquo;, sau đó mở ở thiết bị khác để gộp dữ liệu.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => void handlePickedStandardFile(e)}
              className="hidden"
            />

            <div className="flex flex-wrap gap-2">
              {shareSupported && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleShareFile()}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap ${palette.primaryBg} ${palette.primaryHover}`}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Lưu / Gửi sang Drive, Zalo Cloud
                </button>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={handleDownloadFile}
                className={
                  shareSupported
                    ? 'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap'
                    : `inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap ${palette.primaryBg} ${palette.primaryHover}`
                }
              >
                <Download className="h-3.5 w-3.5" />
                Tải file {SYNC_FILE_NAME}
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
              >
                <FolderOpen className="h-3.5 w-3.5 text-blue-700" />
                Chọn file từ máy / Drive để đồng bộ
              </button>
            </div>

            {/* Preview & Merge/Restore when a file has been selected */}
            {previewFile && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                    <FileJson className="h-4 w-4 text-blue-700 shrink-0" />
                    <span>File đã chọn: {previewFile.fileName}</span>
                  </div>
                  {previewFile.exportedAt && (
                    <span className="font-mono text-[11px] text-slate-500">
                      Xuất lúc: {new Date(previewFile.exportedAt).toLocaleString('vi-VN')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs">
                  <div className="rounded-md border border-slate-200 bg-white p-2.5">
                    <div className="font-semibold text-slate-700">Trên máy hiện tại</div>
                    <div className="mt-1 font-mono tabular-nums text-slate-600">
                      {localData.vehicles.length} xe · {localData.fuelLogs.length} xăng ·{' '}
                      {localData.maintenanceLogs.length} bảo dưỡng
                    </div>
                  </div>
                  <div className="rounded-md border border-blue-200 bg-white p-2.5">
                    <div className="font-semibold text-blue-900">Trong file đồng bộ</div>
                    <div className="mt-1 font-mono tabular-nums text-blue-800">
                      {previewFile.data.vehicles.length} xe · {previewFile.data.fuelLogs.length}{' '}
                      xăng · {previewFile.data.maintenanceLogs.length} bảo dưỡng
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPreviewFile(null)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setPendingOverwrite({ type: 'replace_local', file: previewFile })
                    }
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5 text-amber-600" />
                    Thay thế hoàn toàn bằng file này
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleMergePreview()}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold text-white whitespace-nowrap ${palette.primaryBg} ${palette.primaryHover}`}
                  >
                    <GitMerge className="h-3.5 w-3.5" />
                    Gộp 2 chiều (Khuyên dùng)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Direct Sync File Binding (Desktop Chrome / Edge inside Google Drive / OneDrive folder) */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  2. Gắn trực tiếp 1 file trong thư mục Drive / OneDrive (Trên máy tính)
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Chọn 1 lần duy nhất file nằm trong thư mục Google Drive hoặc OneDrive trên máy
                  tính để ghi đè trực tiếp không sinh thêm bản sao.
                </p>
              </div>
            </div>

            {!directSupported ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">
                Trình duyệt hoặc ứng dụng điện thoại hiện tại sử dụng cơ chế chọn &amp; chia sẻ
                file chuẩn ở mục <strong>1</strong> phía trên (hỗ trợ lưu thẳng sang Google Drive,
                OneDrive, Zalo Cloud).
              </div>
            ) : linkedHandle ? (
              <div className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50/40 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="text-slate-600">Đang gắn với file: </span>
                    <span className="font-mono font-bold text-slate-900">{linkedHandle.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSetLinkedHandle(null)}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-red-700"
                  >
                    <Link2Off className="h-3 w-3" />
                    Ngắt gắn file
                  </button>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={autoWriteLinkedFile}
                    onChange={(e) => onToggleAutoWrite(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>
                    Tự động lưu cập nhật vào file này mỗi khi bấm <strong>Hoàn thành</strong> /{' '}
                    <strong>Cập nhật</strong>
                  </span>
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleReadLinkedNow()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-blue-700 ${busy ? 'animate-spin' : ''}`} />
                    Đọc &amp; Gộp từ file này
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setPendingOverwrite({
                        type: 'overwrite_linked_file',
                        handle: linkedHandle,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 whitespace-nowrap"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Ghi đè dữ liệu mới lên file này
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCreateLinkedFile()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-700" />
                  Tạo mới &amp; gắn file trong Drive / OneDrive
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleOpenAndLinkFile()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-blue-700" />
                  Mở &amp; gắn file có sẵn
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50/60 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
