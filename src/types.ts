export interface CostCategory {
  id: string;
  name: string;
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  make: string;
  model: string;
  year: string;
  fuelType: string;
  description: string;
  source: 'imported' | 'sample' | 'manual';
  categories: CostCategory[];
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  /** Stored as YYYY-MM-DD or YYYY-MM-DD HH:mm */
  date: string;
  timestamp: number;
  odo: number;
  litres: number;
  totalCost: number;
  unitPrice: number;
  /** Litres per 100 km */
  consumption: number | null;
  full: boolean;
  notes: string;
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  /** Stored as YYYY-MM-DD or YYYY-MM-DD HH:mm */
  date: string;
  timestamp: number;
  odo: number;
  title: string;
  categoryId: string;
  categoryName: string;
  totalCost: number;
  notes: string;
}

export type ReportScope = 'overview' | 'fuel' | 'maintenance';
export type TimeFilterMode = 'month' | 'year' | 'custom' | 'all';
export type EntryFormTab = 'fuel' | 'maintenance';

export interface TimeFilter {
  mode: TimeFilterMode;
  year: number;
  /** 1-12 */
  month: number;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
}

export const DEFAULT_CATEGORIES: CostCategory[] = [
  { id: '2', name: 'Bảo trì' },
  { id: '1', name: 'Dịch vụ' },
  { id: '4', name: 'Đăng ký' },
  { id: '31', name: 'Bảo hiểm' },
  { id: '6', name: 'Rửa xe' },
  { id: '7', name: 'Phí cầu đường' },
  { id: '5', name: 'Đậu xe' },
  { id: '8', name: 'Vé phạt' },
  { id: '9', name: 'Điều chỉnh' },
];
