import { DEFAULT_CATEGORIES, FuelLog, MaintenanceLog, Vehicle } from '../types';
import { parseDateToTimestamp } from '../utils/format';

export interface VehicleDataset {
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
}

export function createSecondarySampleVehicles(): VehicleDataset {
  const viosId = 'sample_vios_2022';
  const abId = 'sample_airblade_2023';

  const vehicles: Vehicle[] = [
    {
      id: viosId,
      name: 'Toyota Vios 1.5G',
      plate: '51H-482.19',
      make: 'Toyota',
      model: 'Vios 1.5G CVT',
      year: '2022',
      fuelType: 'Xăng RON 95',
      description: 'Xe gia đình mẫu (có thể chỉnh sửa hoặc xóa)',
      source: 'sample',
      categories: [...DEFAULT_CATEGORIES],
    },
    {
      id: abId,
      name: 'Honda Air Blade 125',
      plate: '59P2-619.04',
      make: 'Honda',
      model: 'Air Blade 125',
      year: '2023',
      fuelType: 'Xăng RON 95',
      description: 'Xe máy đi làm mẫu (có thể chỉnh sửa hoặc xóa)',
      source: 'sample',
      categories: [...DEFAULT_CATEGORIES],
    },
  ];

  const rawViosFuel: Array<[string, number, number, number, number, number | null, string]> = [
    ['2026-08-18 08:15', 48920, 31.4, 700000, 22290, 6.22, ''],
    ['2026-07-29 17:40', 48415, 32.1, 730000, 22740, 6.48, ''],
    ['2026-07-08 09:05', 47920, 30.8, 610000, 19810, 6.1, ''],
    ['2026-06-19 18:10', 47415, 31.2, 650000, 20830, 6.31, ''],
    ['2026-05-24 11:20', 46920, 29.5, 745000, 25250, 6.08, 'Đi tỉnh cuối tuần'],
    ['2026-04-30 16:45', 46435, 32.6, 765000, 23470, 6.45, ''],
    ['2026-03-27 07:50', 45930, 30.4, 695000, 22860, 6.18, ''],
    ['2026-02-22 14:15', 45438, 31.8, 605000, 19030, 6.29, ''],
    ['2026-01-19 08:30', 44932, 30.2, 580000, 19210, 6.14, ''],
    ['2025-12-20 17:10', 44440, 31.0, 615000, 19840, 6.3, ''],
    ['2025-11-18 09:25', 43948, 30.6, 638000, 20850, 6.24, ''],
    ['2025-10-15 16:05', 43458, 29.8, 615000, 20640, null, ''],
  ];

  const rawAbFuel: Array<[string, number, number, number, number, number | null, string]> = [
    ['2026-08-20 07:35', 19450, 3.6, 80000, 22220, 2.25, ''],
    ['2026-08-04 18:05', 19290, 3.55, 80000, 22540, 2.29, ''],
    ['2026-07-18 07:45', 19135, 3.8, 75000, 19740, 2.31, ''],
    ['2026-06-29 17:30', 18970, 3.65, 76000, 20820, 2.21, ''],
    ['2026-06-10 08:00', 18805, 3.5, 78000, 22290, 2.19, ''],
    ['2026-05-19 17:15', 18645, 3.5, 88000, 25140, 2.26, ''],
    ['2026-04-22 08:10', 18490, 3.6, 85000, 23610, 2.32, ''],
    ['2026-03-14 16:50', 18335, 3.55, 80000, 22540, 2.22, ''],
    ['2026-02-12 07:40', 18175, 3.7, 70000, 18920, 2.31, ''],
    ['2026-01-15 17:20', 18015, 3.6, 70000, 19440, null, ''],
  ];

  const fuelLogs: FuelLog[] = [
    ...rawViosFuel.map(([date, odo, litres, totalCost, unitPrice, consumption, notes], idx) => ({
      id: `sample_vios_fuel_${idx}`,
      vehicleId: viosId,
      date,
      timestamp: parseDateToTimestamp(date),
      odo,
      litres,
      totalCost,
      unitPrice,
      consumption,
      full: true,
      notes,
    })),
    ...rawAbFuel.map(([date, odo, litres, totalCost, unitPrice, consumption, notes], idx) => ({
      id: `sample_ab_fuel_${idx}`,
      vehicleId: abId,
      date,
      timestamp: parseDateToTimestamp(date),
      odo,
      litres,
      totalCost,
      unitPrice,
      consumption,
      full: true,
      notes,
    })),
  ];

  const maintenanceLogs: MaintenanceLog[] = [
    {
      id: 'sample_vios_maint_1',
      vehicleId: viosId,
      date: '2026-07-12 09:30',
      timestamp: parseDateToTimestamp('2026-07-12 09:30'),
      odo: 48000,
      title: 'Bảo dưỡng cấp 48.000 km & thay nhớt tổng hợp',
      categoryId: '2',
      categoryName: 'Bảo trì',
      totalCost: 1850000,
      notes: 'Nhớt 0W-20, lọc nhớt, vệ sinh lọc gió điều hòa',
    },
    {
      id: 'sample_vios_maint_2',
      vehicleId: viosId,
      date: '2026-04-10 14:00',
      timestamp: parseDateToTimestamp('2026-04-10 14:00'),
      odo: 46100,
      title: 'Cân bằng động & đảo lốp định kỳ',
      categoryId: '1',
      categoryName: 'Dịch vụ',
      totalCost: 450000,
      notes: '',
    },
    {
      id: 'sample_vios_maint_3',
      vehicleId: viosId,
      date: '2026-01-15 10:15',
      timestamp: parseDateToTimestamp('2026-01-15 10:15'),
      odo: 44900,
      title: 'Gia hạn bảo hiểm TNDS & phí đường bộ',
      categoryId: '31',
      categoryName: 'Bảo hiểm',
      totalCost: 2040000,
      notes: 'Bảo hiểm 1 năm + phí bảo trì đường bộ',
    },
    {
      id: 'sample_vios_maint_4',
      vehicleId: viosId,
      date: '2025-11-22 15:20',
      timestamp: parseDateToTimestamp('2025-11-22 15:20'),
      odo: 44020,
      title: 'Thay gạt mưa Bosch & rửa khoang máy',
      categoryId: '1',
      categoryName: 'Dịch vụ',
      totalCost: 680000,
      notes: '',
    },
    {
      id: 'sample_ab_maint_1',
      vehicleId: abId,
      date: '2026-07-25 10:00',
      timestamp: parseDateToTimestamp('2026-07-25 10:00'),
      odo: 19200,
      title: 'Thay nhớt máy + nhớt láp định kỳ',
      categoryId: '2',
      categoryName: 'Bảo trì',
      totalCost: 235000,
      notes: 'Nhớt Honda Pro 10W-30',
    },
    {
      id: 'sample_ab_maint_2',
      vehicleId: abId,
      date: '2026-04-05 16:30',
      timestamp: parseDateToTimestamp('2026-04-05 16:30'),
      odo: 18420,
      title: 'Vệ sinh nồi & thay lọc gió',
      categoryId: '2',
      categoryName: 'Bảo trì',
      totalCost: 340000,
      notes: '',
    },
  ];

  return { vehicles, fuelLogs, maintenanceLogs };
}
