import { fromDateKey, type DateKey } from './dates';
import { symptomInfo } from './symptoms';
import type { DayLog, DoseLog, Medication, SymptomId, SymptomLog, WeightLog } from './types';
import { kgToLb, round } from './units';

export function csvCell(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: (string | number | boolean | undefined | null)[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

const HEADER = [
  'type',
  'date',
  'time',
  'medication',
  'dose_mg',
  'site',
  'weight_kg',
  'weight_lb',
  'protein_g',
  'water_ml',
  'fiber_g',
  'strength',
  'symptoms',
  'food_noise',
  'energy',
  'note',
];

function dateParts(iso: string): [string, string] {
  const d = new Date(iso);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return [date, time];
}

/** One CSV with every record, ordered by date, suitable for spreadsheets. */
export function exportCsv(data: {
  medications: Medication[];
  doses: DoseLog[];
  weights: WeightLog[];
  days: Record<DateKey, DayLog>;
  symptoms: SymptomLog[];
}): string {
  const medName = new Map(data.medications.map((m) => [m.id, m.name]));
  const rows: { sort: number; row: (string | number | boolean | undefined)[] }[] = [];

  for (const d of data.doses) {
    const [date, time] = dateParts(d.takenAt);
    rows.push({
      sort: Date.parse(d.takenAt),
      row: ['dose', date, time, medName.get(d.medicationId) ?? 'Unknown', d.doseMg, d.site, '', '', '', '', '', '', '', '', '', d.note],
    });
  }
  for (const w of data.weights) {
    const [date, time] = dateParts(w.at);
    rows.push({
      sort: Date.parse(w.at),
      row: ['weight', date, time, '', '', '', round(w.kg, 2), round(kgToLb(w.kg), 1), '', '', '', '', '', '', '', ''],
    });
  }
  for (const day of Object.values(data.days)) {
    if (!day.proteinG && !day.waterMl && !day.fiberG && !day.strength) continue;
    rows.push({
      sort: fromDateKey(day.date).getTime(),
      row: ['nutrition', day.date, '', '', '', '', '', '', day.proteinG, day.waterMl, day.fiberG, day.strength ? 'yes' : 'no', '', '', '', ''],
    });
  }
  for (const s of data.symptoms) {
    const [date, time] = dateParts(s.at);
    const list = (Object.entries(s.symptoms) as [SymptomId, number][])
      .filter(([, sev]) => sev)
      .map(([id, sev]) => `${symptomInfo(id)?.label ?? id} (${sev})`)
      .join('; ');
    rows.push({
      sort: Date.parse(s.at),
      row: ['check_in', date, time, '', '', '', '', '', '', '', '', '', list, s.foodNoise, s.energy, s.note],
    });
  }
  rows.sort((a, b) => a.sort - b.sort);
  return toCsv([HEADER, ...rows.map((r) => r.row)]);
}
