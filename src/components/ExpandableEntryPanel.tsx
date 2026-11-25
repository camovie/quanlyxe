import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Fuel, Wrench, Check } from 'lucide-react';
import {
  DEFAULT_CATEGORIES,
  EntryFormTab,
  FuelLog,
  MaintenanceLog,
  Vehicle,
} from '../types';
import {
  createId,
  formatNumber,
  formatVnd,
  fromDatetimeLocalValue,
  parseDateToTimestamp,
  toDatetimeLocalValue,
} from '../utils/format';

interface ExpandableEntryPanelProps {
  expanded: boolean;
  onToggleExpand: () => void;
  activeTab: EntryFormTab;
  onTabChange: (tab: EntryFormTab) => void;
  vehicles: Vehicle[];
  selectedVehicleId: string;
  latestOdoByVehicle: Record<string, number>;
  latestUnitPriceByVehicle: Record<string, number>;
  recentMaintenanceTitles: string[];
  editingFuel: FuelLog | null;
  editingMaintenance: MaintenanceLog | null;
  onCancelEdit: () => void;
  onSaveFuel: (log: FuelLog, isEdit: boolean) => void;
  onSaveMaintenance: (log: MaintenanceLog, isEdit: boolean) => void;
}

const DEFAULT_SUGGESTIONS = [
  'Thay nhớt',
  'Đăng kiểm',
  'Thay lốp',
  'Bảo dưỡng máy lạnh',
  'Thay nước mát',
  'Làm phanh',
  'Thay bình ắc quy',
  'Bảo hiểm',
];

export function ExpandableEntryPanel({
  expanded,
  onToggleExpand,
  activeTab,
  onTabChange,
  vehicles,
  selectedVehicleId,
  latestOdoByVehicle,
  latestUnitPriceByVehicle,
  recentMaintenanceTitles,
  editingFuel,
  editingMaintenance,
  onCancelEdit,
  onSaveFuel,
  onSaveMaintenance,
}: ExpandableEntryPanelProps) {
  const defaultVehicleId =
    selectedVehicleId !== 'all' && vehicles.some((v) => v.id === selectedVehicleId)
      ? selectedVehicleId
      : vehicles[0]?.id ?? '';

  const [targetVehicleId, setTargetVehicleId] = useState(defaultVehicleId);

  // Fuel form state
  const [fuelDate, setFuelDate] = useState(() => toDatetimeLocalValue());
  const [fuelPrice, setFuelPrice] = useState('');
  const [fuelTotalCost, setFuelTotalCost] = useState('');
  const [fuelOdo, setFuelOdo] = useState('');
  const [fuelFull, setFuelFull] = useState(true);
  const [fuelNotes, setFuelNotes] = useState('');

  // Maintenance form state
  const [maintDate, setMaintDate] = useState(() => toDatetimeLocalValue());
  const [maintOdo, setMaintOdo] = useState('');
  const [maintTitle, setMaintTitle] = useState('');
  const [maintCost, setMaintCost] = useState('');
  const [maintCategoryId, setMaintCategoryId] = useState('2');
  const [maintNotes, setMaintNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [savedFeedback, setSavedFeedback] = useState('');

  // Keep targetVehicleId synced with currently selected vehicle when not editing
  useEffect(() => {
    if (!editingFuel && !editingMaintenance && selectedVehicleId !== 'all') {
      setTargetVehicleId(selectedVehicleId);
    }
  }, [selectedVehicleId, editingFuel, editingMaintenance]);

  // Pre-fill last unit price for convenience when switching vehicle (not editing)
  useEffect(() => {
    if (!editingFuel && targetVehicleId) {
      const lastPrice = latestUnitPriceByVehicle[targetVehicleId];
      if (lastPrice && lastPrice > 0 && !fuelPrice) {
        setFuelPrice(String(Math.round(lastPrice)));
      }
    }
  }, [targetVehicleId, latestUnitPriceByVehicle, editingFuel, fuelPrice]);

  // Populate fields when editing a fuel log
  useEffect(() => {
    if (editingFuel) {
      setTargetVehicleId(editingFuel.vehicleId);
      const dt = editingFuel.date.includes(' ')
        ? editingFuel.date.replace(' ', 'T').slice(0, 16)
        : `${editingFuel.date.slice(0, 10)}T08:00`;
      setFuelDate(dt);
      setFuelPrice(editingFuel.unitPrice ? String(Math.round(editingFuel.unitPrice)) : '');
      setFuelTotalCost(editingFuel.totalCost ? String(Math.round(editingFuel.totalCost)) : '');
      setFuelOdo(editingFuel.odo ? String(editingFuel.odo) : '');
      setFuelFull(editingFuel.full);
      setFuelNotes(editingFuel.notes);
      setErrorMsg('');
    }
  }, [editingFuel]);

  // Populate fields when editing a maintenance log
  useEffect(() => {
    if (editingMaintenance) {
      setTargetVehicleId(editingMaintenance.vehicleId);
      const dt = editingMaintenance.date.includes(' ')
        ? editingMaintenance.date.replace(' ', 'T').slice(0, 16)
        : `${editingMaintenance.date.slice(0, 10)}T09:00`;
      setMaintDate(dt);
      setMaintOdo(editingMaintenance.odo > 0 ? String(editingMaintenance.odo) : '');
      setMaintTitle(editingMaintenance.title);
      setMaintCost(
        editingMaintenance.totalCost ? String(Math.round(editingMaintenance.totalCost)) : ''
      );
      setMaintCategoryId(editingMaintenance.categoryId || '2');
      setMaintNotes(editingMaintenance.notes);
      setErrorMsg('');
    }
  }, [editingMaintenance]);

  const targetVehicle = vehicles.find((v) => v.id === targetVehicleId) ?? vehicles[0];
  const categories = targetVehicle?.categories?.length
    ? targetVehicle.categories
    : DEFAULT_CATEGORIES;

  const latestOdo = latestOdoByVehicle[targetVehicleId] ?? 0;

  // Live calculated fuel preview
  const fuelPreview = useMemo(() => {
    const priceNum = parseFloat(fuelPrice.replace(/[^\d.]/g, ''));
    const totalNum = parseFloat(fuelTotalCost.replace(/[^\d.]/g, ''));
    const odoNum = parseFloat(fuelOdo.replace(/[^\d.]/g, ''));

    const litres =
      Number.isFinite(priceNum) && priceNum > 0 && Number.isFinite(totalNum) && totalNum > 0
        ? totalNum / priceNum
        : null;

    const deltaKm =
      !editingFuel && Number.isFinite(odoNum) && latestOdo > 0 && odoNum > latestOdo
        ? odoNum - latestOdo
        : null;

    const estConsumption =
      litres !== null && deltaKm !== null && deltaKm > 0 && fuelFull
        ? (litres / deltaKm) * 100
        : null;

    return { litres, deltaKm, estConsumption };
  }, [fuelPrice, fuelTotalCost, fuelOdo, latestOdo, fuelFull, editingFuel]);

  const titleSuggestions = useMemo(() => {
    const merged = Array.from(new Set([...recentMaintenanceTitles, ...DEFAULT_SUGGESTIONS]));
    return merged.slice(0, 8);
  }, [recentMaintenanceTitles]);

  const showSuccessToast = (msg: string) => {
    setSavedFeedback(msg);
    setTimeout(() => setSavedFeedback(''), 3000);
  };

  const resetFuelForm = () => {
    setFuelDate(toDatetimeLocalValue());
    setFuelTotalCost('');
    setFuelOdo('');
    setFuelNotes('');
    setFuelFull(true);
    const lastPrice = latestUnitPriceByVehicle[targetVehicleId];
    setFuelPrice(lastPrice ? String(Math.round(lastPrice)) : '');
    setErrorMsg('');
  };

  const resetMaintenanceForm = () => {
    setMaintDate(toDatetimeLocalValue());
    setMaintOdo('');
    setMaintTitle('');
    setMaintCost('');
    setMaintCategoryId('2');
    setMaintNotes('');
    setErrorMsg('');
  };

  const handleFuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!targetVehicleId) {
      setErrorMsg('Vui lòng chọn xe trước khi ghi nhận.');
      return;
    }

    const unitPriceNum = parseFloat(fuelPrice);
    const totalCostNum = parseFloat(fuelTotalCost);
    const odoNum = parseFloat(fuelOdo);

    if (!fuelDate) {
      setErrorMsg('Vui lòng chọn thời gian đổ nhiên liệu.');
      return;
    }
    if (!Number.isFinite(odoNum) || odoNum <= 0) {
      setErrorMsg('Vui lòng nhập số ODO hiện tại của xe (km).');
      return;
    }
    if (!Number.isFinite(unitPriceNum) || unitPriceNum <= 0) {
      setErrorMsg('Vui lòng nhập giá nhiên liệu hợp lệ (đ/lít).');
      return;
    }
    if (!Number.isFinite(totalCostNum) || totalCostNum <= 0) {
      setErrorMsg('Vui lòng nhập tổng chi phí đổ nhiên liệu (VNĐ).');
      return;
    }

    const litres = Number((totalCostNum / unitPriceNum).toFixed(3));
    const dateStr = fromDatetimeLocalValue(fuelDate);

    const log: FuelLog = {
      id: editingFuel ? editingFuel.id : createId('fuel'),
      vehicleId: targetVehicleId,
      date: dateStr,
      timestamp: parseDateToTimestamp(dateStr),
      odo: odoNum,
      litres,
      totalCost: totalCostNum,
      unitPrice: unitPriceNum,
      consumption: editingFuel ? editingFuel.consumption : null,
      full: fuelFull,
      notes: fuelNotes.trim(),
    };

    onSaveFuel(log, Boolean(editingFuel));
    if (editingFuel) {
      onCancelEdit();
      showSuccessToast('Đã cập nhật bản ghi đổ nhiên liệu.');
    } else {
      resetFuelForm();
      showSuccessToast(
        `Đã lưu đổ xăng ${formatNumber(litres, 2)} lít (${formatVnd(totalCostNum)}) tại ODO ${formatNumber(odoNum)} km.`
      );
    }
  };

  const handleMaintenanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!targetVehicleId) {
      setErrorMsg('Vui lòng chọn xe trước khi ghi nhận.');
      return;
    }

    const titleTrimmed = maintTitle.trim();
    const costNum = parseFloat(maintCost);
    const odoNum = maintOdo.trim() === '' ? 0 : parseFloat(maintOdo);

    if (!maintDate) {
      setErrorMsg('Vui lòng chọn ngày tháng bảo dưỡng / sửa chữa.');
      return;
    }
    if (!titleTrimmed) {
      setErrorMsg('Vui lòng nhập tên hạng mục bảo dưỡng hoặc sửa chữa.');
      return;
    }
    if (!Number.isFinite(costNum) || costNum < 0) {
      setErrorMsg('Vui lòng nhập tổng chi phí hợp lệ (VNĐ).');
      return;
    }
    if (maintOdo.trim() !== '' && (!Number.isFinite(odoNum) || odoNum < 0)) {
      setErrorMsg('Số ODO không hợp lệ.');
      return;
    }

    const selectedCat = categories.find((c) => c.id === maintCategoryId);
    const dateStr = fromDatetimeLocalValue(maintDate);

    const log: MaintenanceLog = {
      id: editingMaintenance ? editingMaintenance.id : createId('maint'),
      vehicleId: targetVehicleId,
      date: dateStr,
      timestamp: parseDateToTimestamp(dateStr),
      odo: Number.isFinite(odoNum) ? odoNum : 0,
      title: titleTrimmed,
      categoryId: selectedCat?.id ?? '2',
      categoryName: selectedCat?.name ?? 'Bảo trì',
      totalCost: costNum,
      notes: maintNotes.trim(),
    };

    onSaveMaintenance(log, Boolean(editingMaintenance));
    if (editingMaintenance) {
      onCancelEdit();
      showSuccessToast('Đã cập nhật bản ghi bảo dưỡng sửa chữa.');
    } else {
      resetMaintenanceForm();
      showSuccessToast(`Đã lưu hạng mục "${titleTrimmed}" (${formatVnd(costNum)}).`);
    }
  };

  const isEditing = Boolean(editingFuel || editingMaintenance);

  return (
    <section
      aria-label="Phần mở rộng nhập liệu nhiên liệu và bảo dưỡng"
      className="no-print rounded-lg border border-slate-200 bg-white"
    >
      {/* Collapsible bar header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          className="flex flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">
              {isEditing
                ? editingFuel
                  ? 'Chỉnh sửa thông tin đổ nhiên liệu'
                  : 'Chỉnh sửa thông tin bảo dưỡng / sửa chữa'
                : 'Nhập liệu nhanh — Đổ nhiên liệu & Bảo dưỡng sửa chữa'}
            </div>
            <div className="text-xs text-slate-500">
              {expanded
                ? 'Nhập thông tin mới để tự động cập nhật biểu đồ và báo cáo chi phí'
                : 'Nhấn để mở rộng biểu mẫu ghi nhận lần đổ xăng hoặc hạng mục sửa chữa mới'}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {!expanded && (
            <>
              <button
                type="button"
                onClick={() => {
                  onTabChange('fuel');
                  onToggleExpand();
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
              >
                <Fuel className="h-3.5 w-3.5 text-blue-700" />
                Đổ nhiên liệu
              </button>
              <button
                type="button"
                onClick={() => {
                  onTabChange('maintenance');
                  onToggleExpand();
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
              >
                <Wrench className="h-3.5 w-3.5 text-amber-600" />
                Bảo dưỡng / Sửa chữa
              </button>
            </>
          )}
          {expanded && (
            <button
              type="button"
              onClick={() => {
                if (isEditing) onCancelEdit();
                onToggleExpand();
              }}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              Thu gọn
            </button>
          )}
        </div>
      </div>

      {savedFeedback && (
        <div className="flex items-center gap-2 border-t border-emerald-200 bg-emerald-50 px-5 py-2.5 text-xs font-medium text-emerald-800">
          <Check className="h-4 w-4 shrink-0 text-emerald-700" />
          <span>{savedFeedback}</span>
        </div>
      )}

      {/* Expanded form body */}
      {expanded && (
        <div className="border-t border-slate-200 p-5">
          {/* Top controls: Tab switcher + Target vehicle */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div
              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 p-1"
              role="tablist"
              aria-label="Loại ghi nhận"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'fuel'}
                disabled={Boolean(editingMaintenance)}
                onClick={() => {
                  onTabChange('fuel');
                  setErrorMsg('');
                }}
                className={`inline-flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'fuel'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 disabled:opacity-40'
                }`}
              >
                <Fuel className="h-3.5 w-3.5" />
                Ghi nhận đổ nhiên liệu
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'maintenance'}
                disabled={Boolean(editingFuel)}
                onClick={() => {
                  onTabChange('maintenance');
                  setErrorMsg('');
                }}
                className={`inline-flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'maintenance'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 disabled:opacity-40'
                }`}
              >
                <Wrench className="h-3.5 w-3.5" />
                Ghi nhận bảo dưỡng / sửa chữa
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <label
                htmlFor="entry-vehicle-select"
                className="text-xs font-medium text-slate-600 whitespace-nowrap"
              >
                Áp dụng cho xe:
              </label>
              <select
                id="entry-vehicle-select"
                value={targetVehicleId}
                onChange={(e) => setTargetVehicleId(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.plate ? `(${v.plate})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          {activeTab === 'fuel' ? (
            <form onSubmit={handleFuelSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Thời gian đổ nhiên liệu <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={fuelDate}
                    onChange={(e) => setFuelDate(e.target.value)}
                    required
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    ODO hiện tại của xe (km) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={fuelOdo}
                    onChange={(e) => setFuelOdo(e.target.value)}
                    placeholder={
                      latestOdo > 0 ? `Gần nhất: ${formatNumber(latestOdo)}` : 'Ví dụ: 181250'
                    }
                    required
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Giá nhiên liệu (đ/lít) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="10"
                    min="1"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(e.target.value)}
                    placeholder="Ví dụ: 22150"
                    required
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Tổng chi phí (VNĐ) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="1"
                    value={fuelTotalCost}
                    onChange={(e) => setFuelTotalCost(e.target.value)}
                    placeholder="Ví dụ: 500000"
                    required
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>
              </div>

              {/* Secondary line: Notes + Full tank toggle + Live preview */}
              <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Ghi chú (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={fuelNotes}
                    onChange={(e) => setFuelNotes(e.target.value)}
                    placeholder="Ví dụ: Petrolimex, xăng RON 95, đi cao tốc..."
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4 py-2 text-xs text-slate-600 lg:col-span-4">
                  <label className="inline-flex cursor-pointer items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      checked={fuelFull}
                      onChange={(e) => setFuelFull(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    <span className="font-medium text-slate-700">Đổ đầy bình</span>
                  </label>

                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>

                  <span className="font-mono tabular-nums text-slate-700">
                    Lượng xăng:{' '}
                    <strong className="font-semibold text-slate-900">
                      {fuelPreview.litres !== null ? `${formatNumber(fuelPreview.litres, 2)} L` : '—'}
                    </strong>
                  </span>

                  {fuelPreview.estConsumption !== null && (
                    <>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-mono tabular-nums text-teal-700">
                        Ước tính:{' '}
                        <strong className="font-semibold">
                          {formatNumber(fuelPreview.estConsumption, 2)} L/100km
                        </strong>
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2.5 lg:col-span-3">
                  {editingFuel && (
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      Hủy sửa
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-md bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
                  >
                    {editingFuel ? 'Cập nhật đổ xăng' : 'Lưu lần đổ nhiên liệu'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Ngày tháng bảo dưỡng / sửa chữa <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={maintDate}
                    onChange={(e) => setMaintDate(e.target.value)}
                    required
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Tên hạng mục bảo dưỡng / sửa chữa <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={maintTitle}
                    onChange={(e) => setMaintTitle(e.target.value)}
                    placeholder="Ví dụ: Thay nhớt, đăng kiểm, làm phanh..."
                    required
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Số ODO lúc bảo dưỡng (km)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={maintOdo}
                    onChange={(e) => setMaintOdo(e.target.value)}
                    placeholder={
                      latestOdo > 0 ? `Gần nhất: ${formatNumber(latestOdo)}` : 'Ví dụ: 181000'
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Tổng chi phí (VNĐ) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={maintCost}
                    onChange={(e) => setMaintCost(e.target.value)}
                    placeholder="Ví dụ: 1500000"
                    required
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>
              </div>

              {/* Quick item suggestions */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                <span className="text-slate-500">Hạng mục phổ biến:</span>
                {titleSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMaintTitle(item)}
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-12">
                <div className="lg:col-span-3">
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Nhóm chi phí
                  </label>
                  <select
                    value={maintCategoryId}
                    onChange={(e) => setMaintCategoryId(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-6">
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Chi tiết công việc / Ghi chú (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={maintNotes}
                    onChange={(e) => setMaintNotes(e.target.value)}
                    placeholder="Ví dụ: Thay nhớt 10W40, lọc nhớt, phí đăng kiểm + đường bộ..."
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 lg:col-span-3">
                  {editingMaintenance && (
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      Hủy sửa
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-md bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 whitespace-nowrap shrink-0"
                  >
                    {editingMaintenance ? 'Cập nhật hạng mục' : 'Lưu bảo dưỡng / sửa chữa'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
