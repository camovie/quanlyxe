import { FuelLog, MaintenanceLog, TimeFilter } from '../types';
import { extractDateOnly, formatDateDisplay } from './format';

export interface PeriodBounds {
  startTs: number | null;
  endTs: number | null;
  label: string;
}

export function getPeriodBounds(filter: TimeFilter): PeriodBounds {
  if (filter.mode === 'all') {
    return {
      startTs: null,
      endTs: null,
      label: 'Toàn bộ lịch sử',
    };
  }

  if (filter.mode === 'year') {
    const startTs = new Date(filter.year, 0, 1, 0, 0, 0, 0).getTime();
    const endTs = new Date(filter.year, 11, 31, 23, 59, 59, 999).getTime();
    return {
      startTs,
      endTs,
      label: `Năm ${filter.year}`,
    };
  }

  if (filter.mode === 'month') {
    const startTs = new Date(filter.year, filter.month - 1, 1, 0, 0, 0, 0).getTime();
    const endTs = new Date(filter.year, filter.month, 0, 23, 59, 59, 999).getTime();
    const mm = String(filter.month).padStart(2, '0');
    return {
      startTs,
      endTs,
      label: `Tháng ${mm}/${filter.year}`,
    };
  }

  // Custom date range
  const parseBoundary = (iso: string, endOfDay: boolean): number | null => {
    if (!iso) return null;
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return endOfDay
      ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999).getTime()
      : new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0).getTime();
  };

  const startTs = parseBoundary(filter.startDate, false);
  const endTs = parseBoundary(filter.endDate, true);
  const startLabel = filter.startDate ? formatDateDisplay(filter.startDate) : 'Đầu kỳ';
  const endLabel = filter.endDate ? formatDateDisplay(filter.endDate) : 'Hiện tại';

  return {
    startTs,
    endTs,
    label: `${startLabel} – ${endLabel}`,
  };
}

export function isTimestampInBounds(ts: number, bounds: PeriodBounds): boolean {
  if (bounds.startTs !== null && ts < bounds.startTs) return false;
  if (bounds.endTs !== null && ts > bounds.endTs) return false;
  return true;
}

export interface ChartBucket {
  key: string;
  label: string;
  fuelCost: number;
  maintenanceCost: number;
  totalCost: number;
  litres: number;
  avgConsumption: number | null;
  avgUnitPrice: number | null;
  fuelCount: number;
  maintenanceCount: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  totalCost: number;
  count: number;
  share: number;
}

export interface EfficiencyPoint {
  id: string;
  date: string;
  shortDate: string;
  odo: number;
  consumption: number | null;
  unitPrice: number;
  litres: number;
  totalCost: number;
}

export interface VehicleReportAnalytics {
  bounds: PeriodBounds;
  filteredFuel: FuelLog[];
  filteredMaintenance: MaintenanceLog[];
  totalFuelCost: number;
  totalMaintenanceCost: number;
  totalOperatingCost: number;
  totalLitres: number;
  distanceKm: number;
  avgConsumption: number | null;
  minConsumption: number | null;
  maxConsumption: number | null;
  avgUnitPrice: number | null;
  fuelCostPerKm: number | null;
  totalCostPerKm: number | null;
  latestOdo: number;
  chartSeries: ChartBucket[];
  efficiencySeries: EfficiencyPoint[];
  maintenanceByCategory: CategoryBreakdownItem[];
  availableYears: number[];
}

export function computeVehicleAnalytics(
  allFuelLogs: FuelLog[],
  allMaintenanceLogs: MaintenanceLog[],
  filter: TimeFilter
): VehicleReportAnalytics {
  const bounds = getPeriodBounds(filter);

  const filteredFuel = allFuelLogs
    .filter((l) => isTimestampInBounds(l.timestamp, bounds))
    .sort((a, b) => b.timestamp - a.timestamp || b.odo - a.odo);

  const filteredMaintenance = allMaintenanceLogs
    .filter((l) => isTimestampInBounds(l.timestamp, bounds))
    .sort((a, b) => b.timestamp - a.timestamp);

  // Collect all available years from both logs
  const yearSet = new Set<number>();
  for (const l of allFuelLogs) {
    const y = new Date(l.timestamp).getFullYear();
    if (y > 1990) yearSet.add(y);
  }
  for (const l of allMaintenanceLogs) {
    const y = new Date(l.timestamp).getFullYear();
    if (y > 1990) yearSet.add(y);
  }
  const availableYears = Array.from(yearSet).sort((a, b) => b - a);

  const totalFuelCost = filteredFuel.reduce((sum, l) => sum + l.totalCost, 0);
  const totalMaintenanceCost = filteredMaintenance.reduce((sum, l) => sum + l.totalCost, 0);
  const totalOperatingCost = totalFuelCost + totalMaintenanceCost;
  const totalLitres = filteredFuel.reduce((sum, l) => sum + l.litres, 0);

  // Calculate accurate distance driven across the selected period per vehicle
  // Uses the log immediately preceding the period start so even 1-entry months have exact km!
  const fuelByVehicleAll = new Map<string, FuelLog[]>();
  for (const log of allFuelLogs) {
    const arr = fuelByVehicleAll.get(log.vehicleId) ?? [];
    arr.push(log);
    fuelByVehicleAll.set(log.vehicleId, arr);
  }
  const fuelByVehicleFiltered = new Map<string, FuelLog[]>();
  for (const log of filteredFuel) {
    const arr = fuelByVehicleFiltered.get(log.vehicleId) ?? [];
    arr.push(log);
    fuelByVehicleFiltered.set(log.vehicleId, arr);
  }

  let distanceKm = 0;
  let weightedLitresForConsumption = 0;
  let weightedDistanceForConsumption = 0;

  for (const [vehicleId, vFiltered] of fuelByVehicleFiltered.entries()) {
    const vAllAsc = [...(fuelByVehicleAll.get(vehicleId) ?? [])].sort(
      (a, b) => a.timestamp - b.timestamp || a.odo - b.odo
    );
    const vFiltAsc = [...vFiltered].sort((a, b) => a.timestamp - b.timestamp || a.odo - b.odo);
    if (vFiltAsc.length === 0) continue;

    const firstInPeriod = vFiltAsc[0];
    const lastInPeriod = vFiltAsc[vFiltAsc.length - 1];

    const firstIdx = vAllAsc.findIndex((item) => item.id === firstInPeriod.id);
    const prevLog = firstIdx > 0 ? vAllAsc[firstIdx - 1] : null;

    if (prevLog && lastInPeriod.odo > prevLog.odo) {
      const dist = lastInPeriod.odo - prevLog.odo;
      distanceKm += dist;
      const litresInPeriod = vFiltAsc.reduce((s, l) => s + l.litres, 0);
      weightedDistanceForConsumption += dist;
      weightedLitresForConsumption += litresInPeriod;
    } else if (vFiltAsc.length >= 2 && lastInPeriod.odo > firstInPeriod.odo) {
      const dist = lastInPeriod.odo - firstInPeriod.odo;
      distanceKm += dist;
      // Exclude first fill litres since distance starts from first fill's ODO
      const litresAfterFirst = vFiltAsc.slice(1).reduce((s, l) => s + l.litres, 0);
      weightedDistanceForConsumption += dist;
      weightedLitresForConsumption += litresAfterFirst;
    }
  }

  const consumptionValues = filteredFuel
    .map((l) => l.consumption)
    .filter((v): v is number => v !== null && v > 0);

  let avgConsumption: number | null = null;
  if (weightedDistanceForConsumption > 0 && weightedLitresForConsumption > 0) {
    avgConsumption = Number(
      ((weightedLitresForConsumption / weightedDistanceForConsumption) * 100).toFixed(2)
    );
  } else if (consumptionValues.length > 0) {
    avgConsumption = Number(
      (consumptionValues.reduce((a, b) => a + b, 0) / consumptionValues.length).toFixed(2)
    );
  }

  const minConsumption = consumptionValues.length > 0 ? Math.min(...consumptionValues) : null;
  const maxConsumption = consumptionValues.length > 0 ? Math.max(...consumptionValues) : null;
  const avgUnitPrice =
    totalLitres > 0 ? Math.round(totalFuelCost / totalLitres) : null;

  const fuelCostPerKm = distanceKm > 0 ? Math.round(totalFuelCost / distanceKm) : null;
  const totalCostPerKm = distanceKm > 0 ? Math.round(totalOperatingCost / distanceKm) : null;

  const latestOdoFuel = allFuelLogs.reduce((max, l) => Math.max(max, l.odo), 0);
  const latestOdoMaint = allMaintenanceLogs.reduce((max, l) => Math.max(max, l.odo), 0);
  const latestOdo = Math.max(latestOdoFuel, latestOdoMaint);

  // Build chart series depending on filter mode
  const chartSeries = buildChartSeries(filteredFuel, filteredMaintenance, filter, bounds);

  // Efficiency & fuel price series (chronological ascending)
  const efficiencySeries: EfficiencyPoint[] = [...filteredFuel]
    .sort((a, b) => a.timestamp - b.timestamp || a.odo - b.odo)
    .map((l) => {
      const iso = extractDateOnly(l.date);
      const parts = iso.split('-');
      const shortDate =
        parts.length === 3
          ? filter.mode === 'all'
            ? `${parts[1]}/${parts[0].slice(2)}`
            : `${parts[2]}/${parts[1]}`
          : l.date;
      return {
        id: l.id,
        date: l.date,
        shortDate,
        odo: l.odo,
        consumption: l.consumption,
        unitPrice: l.unitPrice,
        litres: l.litres,
        totalCost: l.totalCost,
      };
    });

  // Maintenance breakdown by category
  const catMap = new Map<string, { categoryId: string; categoryName: string; totalCost: number; count: number }>();
  for (const m of filteredMaintenance) {
    const key = m.categoryName || 'Khác';
    const existing = catMap.get(key);
    if (existing) {
      existing.totalCost += m.totalCost;
      existing.count += 1;
    } else {
      catMap.set(key, {
        categoryId: m.categoryId,
        categoryName: key,
        totalCost: m.totalCost,
        count: 1,
      });
    }
  }

  const maintenanceByCategory: CategoryBreakdownItem[] = Array.from(catMap.values())
    .sort((a, b) => b.totalCost - a.totalCost)
    .map((item) => ({
      ...item,
      share: totalMaintenanceCost > 0 ? (item.totalCost / totalMaintenanceCost) * 100 : 0,
    }));

  return {
    bounds,
    filteredFuel,
    filteredMaintenance,
    totalFuelCost,
    totalMaintenanceCost,
    totalOperatingCost,
    totalLitres,
    distanceKm,
    avgConsumption,
    minConsumption,
    maxConsumption,
    avgUnitPrice,
    fuelCostPerKm,
    totalCostPerKm,
    latestOdo,
    chartSeries,
    efficiencySeries,
    maintenanceByCategory,
    availableYears,
  };
}

function buildChartSeries(
  filteredFuel: FuelLog[],
  filteredMaintenance: MaintenanceLog[],
  filter: TimeFilter,
  bounds: PeriodBounds
): ChartBucket[] {
  type Accumulator = {
    key: string;
    label: string;
    fuelCost: number;
    maintenanceCost: number;
    litres: number;
    consumptionSum: number;
    consumptionCount: number;
    unitPriceWeightedSum: number;
    fuelCount: number;
    maintenanceCount: number;
  };

  const buckets = new Map<string, Accumulator>();

  const ensureBucket = (key: string, label: string): Accumulator => {
    let b = buckets.get(key);
    if (!b) {
      b = {
        key,
        label,
        fuelCost: 0,
        maintenanceCost: 0,
        litres: 0,
        consumptionSum: 0,
        consumptionCount: 0,
        unitPriceWeightedSum: 0,
        fuelCount: 0,
        maintenanceCount: 0,
      };
      buckets.set(key, b);
    }
    return b;
  };

  let granularity: 'day' | 'month' | 'year' = 'month';

  if (filter.mode === 'year') {
    granularity = 'month';
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      ensureBucket(`${filter.year}-${mm}`, `Th ${m}`);
    }
  } else if (filter.mode === 'all') {
    granularity = 'year';
  } else if (filter.mode === 'month') {
    granularity = 'day';
  } else {
    // Custom range granularity based on day span
    const spanDays =
      bounds.startTs !== null && bounds.endTs !== null
        ? (bounds.endTs - bounds.startTs) / (1000 * 60 * 60 * 24)
        : 365;
    if (spanDays <= 62) granularity = 'day';
    else if (spanDays <= 730) granularity = 'month';
    else granularity = 'year';
  }

  const getKeyAndLabel = (ts: number): { key: string; label: string } => {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    if (granularity === 'year') {
      return { key: `${yyyy}`, label: `${yyyy}` };
    }
    if (granularity === 'month') {
      return {
        key: `${yyyy}-${mm}`,
        label: filter.mode === 'year' ? `Th ${d.getMonth() + 1}` : `${mm}/${yyyy}`,
      };
    }
    return { key: `${yyyy}-${mm}-${dd}`, label: `${dd}/${mm}` };
  };

  for (const log of filteredFuel) {
    const { key, label } = getKeyAndLabel(log.timestamp);
    const b = ensureBucket(key, label);
    b.fuelCost += log.totalCost;
    b.litres += log.litres;
    b.fuelCount += 1;
    b.unitPriceWeightedSum += log.unitPrice * log.litres;
    if (log.consumption !== null && log.consumption > 0) {
      b.consumptionSum += log.consumption;
      b.consumptionCount += 1;
    }
  }

  for (const log of filteredMaintenance) {
    const { key, label } = getKeyAndLabel(log.timestamp);
    const b = ensureBucket(key, label);
    b.maintenanceCost += log.totalCost;
    b.maintenanceCount += 1;
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((b) => ({
      key: b.key,
      label: b.label,
      fuelCost: Math.round(b.fuelCost),
      maintenanceCost: Math.round(b.maintenanceCost),
      totalCost: Math.round(b.fuelCost + b.maintenanceCost),
      litres: Number(b.litres.toFixed(2)),
      avgConsumption:
        b.consumptionCount > 0
          ? Number((b.consumptionSum / b.consumptionCount).toFixed(2))
          : null,
      avgUnitPrice:
        b.litres > 0 ? Math.round(b.unitPriceWeightedSum / b.litres) : null,
      fuelCount: b.fuelCount,
      maintenanceCount: b.maintenanceCount,
    }));
}
