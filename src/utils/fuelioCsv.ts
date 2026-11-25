import {
  CostCategory,
  DEFAULT_CATEGORIES,
  FuelLog,
  MaintenanceLog,
  Vehicle,
} from '../types';
import { createId, parseDateToTimestamp } from './format';

/**
 * RFC-4180 compliant CSV parser that properly preserves multiline quoted fields
 * (e.g. Fuelio maintenance notes with embedded newlines) and unquoted empty cells.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  // Normalize CRLF -> LF and strip BOM
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        if (row.some((cell) => cell.trim() !== '')) {
          rows.push(row);
        }
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

export interface ParsedFuelioBundle {
  vehicle: Vehicle;
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
}

export function parseFuelioCsv(
  csvText: string,
  options?: { vehicleId?: string; source?: Vehicle['source'] }
): ParsedFuelioBundle {
  const rows = parseCsvRows(csvText);

  let currentSection = '';
  let headers: string[] = [];

  const vehicleRows: Record<string, string>[] = [];
  const logRows: Record<string, string>[] = [];
  const categoryRows: Record<string, string>[] = [];
  const costRows: Record<string, string>[] = [];

  for (const row of rows) {
    const first = (row[0] ?? '').trim();
    if (first.startsWith('## ')) {
      currentSection = first.replace(/^##\s+/, '').trim();
      headers = [];
      continue;
    }

    if (!currentSection) continue;

    if (headers.length === 0) {
      headers = row.map((h) => h.trim());
      continue;
    }

    const record: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      record[headers[i]] = (row[i] ?? '').trim();
    }

    if (currentSection === 'Vehicle') vehicleRows.push(record);
    else if (currentSection === 'Log') logRows.push(record);
    else if (currentSection === 'CostCategories') categoryRows.push(record);
    else if (currentSection === 'Costs') costRows.push(record);
  }

  const parsedCategories: CostCategory[] =
    categoryRows.length > 0
      ? categoryRows
          .filter((r) => r['CostTypeID'] && r['Name'])
          .map((r) => ({
            id: r['CostTypeID'],
            name: r['Name'],
          }))
      : [...DEFAULT_CATEGORIES];

  const categoryMap = new Map<string, string>();
  for (const cat of parsedCategories) {
    categoryMap.set(cat.id, cat.name);
  }

  const rawVehicle = vehicleRows[0] ?? {};
  const vehicleId = options?.vehicleId ?? rawVehicle['guid'] ?? createId('veh');

  const vehicle: Vehicle = {
    id: vehicleId,
    name: rawVehicle['Name'] || 'Xe nhập từ CSV',
    plate: rawVehicle['Plate'] || '',
    make: rawVehicle['Make'] || '',
    model: rawVehicle['Model'] || '',
    year: rawVehicle['Year'] || '',
    fuelType: 'Xăng',
    description: rawVehicle['Description'] || '',
    source: options?.source ?? 'imported',
    categories: parsedCategories,
  };

  const fuelLogs: FuelLog[] = logRows
    .map((r): FuelLog | null => {
      const date = r['Data'] || r['Date'] || '';
      const odo = parseFloat(r['Odo (km)'] || r['Odo'] || '0');
      const litres = parseFloat(r['Fuel (litres)'] || r['Fuel'] || '0');
      const totalCost = parseFloat(r['Price (optional)'] || r['Price'] || '0');
      const rawUnitPrice = parseFloat(r['VolumePrice'] || '0');
      const unitPrice =
        rawUnitPrice > 0
          ? rawUnitPrice
          : litres > 0 && totalCost > 0
            ? Math.round(totalCost / litres)
            : 0;
      const rawConsumption = r['l/100km (optional)'] || r['l/100km'] || '';
      const consumption =
        rawConsumption !== '' && !Number.isNaN(parseFloat(rawConsumption))
          ? parseFloat(rawConsumption)
          : null;

      if (!date || (odo <= 0 && totalCost <= 0 && litres <= 0)) return null;

      return {
        id: r['guid'] || createId('fuel'),
        vehicleId,
        date,
        timestamp: parseDateToTimestamp(date),
        odo: Number.isFinite(odo) ? odo : 0,
        litres: Number.isFinite(litres) ? litres : 0,
        totalCost: Number.isFinite(totalCost) ? totalCost : 0,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        consumption,
        full: r['Full'] !== '0',
        notes: r['Notes (optional)'] || r['Notes'] || '',
      };
    })
    .filter((item): item is FuelLog => item !== null)
    .sort((a, b) => b.timestamp - a.timestamp || b.odo - a.odo);

  const maintenanceLogs: MaintenanceLog[] = costRows
    .map((r): MaintenanceLog | null => {
      const title = r['CostTitle'] || '';
      const date = r['Date'] || '';
      const odo = parseFloat(r['Odo'] || '0');
      const cost = parseFloat(r['Cost'] || '0');
      const categoryId = r['CostTypeID'] || '2';
      const categoryName = categoryMap.get(categoryId) || 'Bảo trì';

      if (!title && !date) return null;

      return {
        id: r['guid'] || createId('maint'),
        vehicleId,
        date,
        timestamp: parseDateToTimestamp(date),
        odo: Number.isFinite(odo) ? odo : 0,
        title: title || categoryName,
        categoryId,
        categoryName,
        totalCost: Number.isFinite(cost) ? cost : 0,
        notes: r['Notes'] || '',
      };
    })
    .filter((item): item is MaintenanceLog => item !== null)
    .sort((a, b) => b.timestamp - a.timestamp);

  return { vehicle, fuelLogs, maintenanceLogs };
}

function csvEscape(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Exports a vehicle and its fuel/maintenance history back into Fuelio-compatible CSV.
 */
export function exportFuelioCsv(
  vehicle: Vehicle,
  fuelLogs: FuelLog[],
  maintenanceLogs: MaintenanceLog[]
): string {
  const lines: string[] = [];

  lines.push('"## Vehicle"');
  lines.push(
    [
      'Name',
      'Description',
      'DistUnit',
      'FuelUnit',
      'ConsumptionUnit',
      'ImportCSVDateFormat',
      'VIN',
      'Insurance',
      'Plate',
      'Make',
      'Model',
      'Year',
      'guid',
    ]
      .map(csvEscape)
      .join(',')
  );
  lines.push(
    [
      vehicle.name,
      vehicle.description,
      '0',
      '0',
      '0',
      'yyyy-MM-dd',
      '',
      '',
      vehicle.plate,
      vehicle.make,
      vehicle.model,
      vehicle.year,
      vehicle.id,
    ]
      .map(csvEscape)
      .join(',')
  );

  lines.push('"## Log"');
  lines.push(
    [
      'Data',
      'Odo (km)',
      'Fuel (litres)',
      'Full',
      'Price (optional)',
      'l/100km (optional)',
      'Notes (optional)',
      'VolumePrice',
      'guid',
    ]
      .map(csvEscape)
      .join(',')
  );

  const sortedFuel = [...fuelLogs].sort((a, b) => b.timestamp - a.timestamp || b.odo - a.odo);
  for (const log of sortedFuel) {
    lines.push(
      [
        log.date,
        log.odo.toFixed(1),
        log.litres.toFixed(3),
        log.full ? '1' : '0',
        log.totalCost.toFixed(1),
        log.consumption !== null ? log.consumption.toFixed(2) : '',
        log.notes,
        log.unitPrice.toFixed(1),
        log.id,
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  lines.push('"## CostCategories"');
  lines.push(['CostTypeID', 'Name'].map(csvEscape).join(','));
  for (const cat of vehicle.categories) {
    lines.push([cat.id, cat.name].map(csvEscape).join(','));
  }

  lines.push('"## Costs"');
  lines.push(
    ['CostTitle', 'Date', 'Odo', 'CostTypeID', 'Notes', 'Cost', 'guid'].map(csvEscape).join(',')
  );
  const sortedMaint = [...maintenanceLogs].sort((a, b) => b.timestamp - a.timestamp);
  for (const log of sortedMaint) {
    lines.push(
      [
        log.title,
        log.date,
        log.odo ? String(Math.round(log.odo)) : '0',
        log.categoryId,
        log.notes,
        log.totalCost.toFixed(1),
        log.id,
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  return '\uFEFF' + lines.join('\n');
}

/**
 * Computes l/100km for a newly added or edited fuel log based on chronological ODO neighbors.
 */
export function recalculateVehicleFuelLogs(logs: FuelLog[]): FuelLog[] {
  const asc = [...logs].sort((a, b) => a.timestamp - b.timestamp || a.odo - b.odo);
  let lastFullOdo: number | null = null;
  let accumulatedLitres = 0;

  const updated = asc.map((log) => {
    if (log.full) {
      const totalSegmentLitres = accumulatedLitres + log.litres;
      let computedConsumption = log.consumption;

      if (lastFullOdo !== null && log.odo > lastFullOdo && totalSegmentLitres > 0) {
        const dist = log.odo - lastFullOdo;
        if (dist > 0) {
          computedConsumption = Number(((totalSegmentLitres / dist) * 100).toFixed(2));
        }
      }

      lastFullOdo = log.odo;
      accumulatedLitres = 0;
      return { ...log, consumption: computedConsumption };
    } else {
      accumulatedLitres += log.litres;
      return { ...log, consumption: null };
    }
  });

  return updated.sort((a, b) => b.timestamp - a.timestamp || b.odo - a.odo);
}
