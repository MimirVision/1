import { addDays, DAY_MS, formatMediumDate, formatShortDate, toDateKey, type DateKey } from './dates';
import { getPreset } from './medications';
import { adherence, describeSchedule, dosesForMedication } from './schedule';
import { symptomCounts, symptomInfo, SEVERITY_LABEL } from './symptoms';
import type { DayLog, DoseLog, Medication, Profile, SymptomLog, Targets, WeightLog } from './types';
import { bmi, formatDose, formatWeight, formatWeightDelta, kgToLb } from './units';
import { doseChanges, sortWeights, weeklyRate, weightSummary } from './weight';

export interface ReportInput {
  profile: Profile;
  medications: Medication[];
  doses: DoseLog[];
  weights: WeightLog[];
  symptoms: SymptomLog[];
  days: Record<DateKey, DayLog>;
  targets: Targets;
  now: Date;
  /** Look-back window for adherence, side effects and nutrition. */
  rangeDays?: number;
  appName: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Inline SVG line chart of weight over time (no external assets, so it prints anywhere). */
export function weightChartSvg(weights: WeightLog[], unit: Profile['weightUnit'], width = 640, height = 200): string {
  const sorted = sortWeights(weights);
  if (sorted.length < 2) return '';
  const values = sorted.map((w) => (unit === 'kg' ? w.kg : kgToLb(w.kg)));
  const times = sorted.map((w) => Date.parse(w.at));
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const pad = Math.max(1, (maxV - minV) * 0.15);
  const lo = minV - pad;
  const hi = maxV + pad;
  const t0 = times[0];
  const t1 = times[times.length - 1];
  const left = 44;
  const right = 12;
  const top = 12;
  const bottom = 28;
  const x = (t: number) => left + ((t - t0) / Math.max(1, t1 - t0)) * (width - left - right);
  const y = (v: number) => top + (1 - (v - lo) / (hi - lo)) * (height - top - bottom);
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(times[i]).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const gridValues = [lo + (hi - lo) * 0.2, lo + (hi - lo) * 0.5, lo + (hi - lo) * 0.8];
  const grid = gridValues
    .map(
      (v) =>
        `<line x1="${left}" x2="${width - right}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#E4E1EE" stroke-width="1"/>` +
        `<text x="${left - 6}" y="${(y(v) + 4).toFixed(1)}" font-size="10" text-anchor="end" fill="#6B6880">${v.toFixed(0)}</text>`,
    )
    .join('');
  const labels = [t0, t0 + (t1 - t0) / 2, t1]
    .map(
      (t, i) =>
        `<text x="${x(t).toFixed(1)}" y="${height - 8}" font-size="10" text-anchor="${i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}" fill="#6B6880">${formatShortDate(new Date(t))}</text>`,
    )
    .join('');
  const dots = values
    .map((v, i) => `<circle cx="${x(times[i]).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.5" fill="#5B3DF5"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${width} ${height}" role="img" aria-label="Weight chart">${grid}<path d="${path}" fill="none" stroke="#5B3DF5" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${dots}${labels}</svg>`;
}

function percent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`;
}

export function buildReportHtml(input: ReportInput): string {
  const { profile, medications, doses, weights, symptoms, days, targets, now, appName } = input;
  const rangeDays = input.rangeDays ?? 90;
  const from = new Date(now.getTime() - rangeDays * DAY_MS);
  const unit = profile.weightUnit;
  const summary = weightSummary(profile.startWeightKg, profile.goalWeightKg, weights);
  const rate = weeklyRate(weights, now);
  const startBmi = bmi(profile.startWeightKg, profile.heightCm);
  const currentBmi = bmi(summary.currentKg, profile.heightCm);
  const journeyStart = new Date(profile.journeyStartedAt);
  const weeksOn = Math.max(0, Math.floor((now.getTime() - journeyStart.getTime()) / (7 * DAY_MS)));

  const medRows = medications
    .map((m) => {
      const preset = getPreset(m.presetId);
      return `<tr><td><strong>${escapeHtml(m.name)}</strong><br/><span class="muted">${escapeHtml(preset.subtitle)}</span></td><td>${formatDose(m.currentDoseMg)}</td><td>${escapeHtml(describeSchedule(m.schedule))}</td><td>${formatMediumDate(new Date(m.startedAt))}</td><td>${percent(adherence(m, doses, from, now))}</td></tr>`;
    })
    .join('');

  const changeRows = medications
    .flatMap((m) =>
      doseChanges(dosesForMedication(doses, m.id)).map(
        (c) => `<tr><td>${formatMediumDate(new Date(c.at))}</td><td>${escapeHtml(m.name)}</td><td>${formatDose(c.doseMg)}</td></tr>`,
      ),
    )
    .join('');

  const recentWeights = sortWeights(weights).slice(-12).reverse();
  const weightRows = recentWeights
    .map((w) => `<tr><td>${formatMediumDate(new Date(w.at))}</td><td>${formatWeight(w.kg, unit)}</td><td>${formatWeightDelta(w.kg - profile.startWeightKg, unit)}</td></tr>`)
    .join('');

  const counts = symptomCounts(symptoms, from.getTime());
  const symptomRows = counts
    .map((c) => {
      const severity = SEVERITY_LABEL[Math.min(3, Math.max(1, Math.round(c.avgSeverity))) as 1 | 2 | 3];
      return `<tr><td>${escapeHtml(symptomInfo(c.symptom).label)}</td><td>${c.count}</td><td>${severity}</td></tr>`;
    })
    .join('');

  const keys: DateKey[] = [];
  for (let i = 0; i < rangeDays; i++) keys.push(toDateKey(addDays(now, -i)));
  const logged = keys.map((k) => days[k]).filter((d): d is DayLog => !!d && (d.proteinG > 0 || d.waterMl > 0 || d.fiberG > 0 || d.strength));
  const avg = (pick: (d: DayLog) => number) => (logged.length ? logged.reduce((s, d) => s + pick(d), 0) / logged.length : null);
  const avgProtein = avg((d) => d.proteinG);
  const proteinHitDays = logged.filter((d) => d.proteinG >= targets.proteinG).length;
  const strengthSessions = logged.filter((d) => d.strength).length;
  const strengthPerWeek = strengthSessions / Math.max(1, rangeDays / 7);

  const notes = doses
    .filter((d) => d.note && Date.parse(d.takenAt) >= from.getTime())
    .sort((a, b) => Date.parse(b.takenAt) - Date.parse(a.takenAt))
    .slice(0, 10)
    .map((d) => `<li><span class="muted">${formatMediumDate(new Date(d.takenAt))}:</span> ${escapeHtml(d.note ?? '')}</li>`)
    .join('');

  const stat = (label: string, value: string, sub = '') =>
    `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div>${sub ? `<div class="muted">${sub}</div>` : ''}</div>`;

  return `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>GLP-1 progress report</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #17151F; margin: 32px; font-size: 12px; line-height: 1.45; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #ECE8FF; color: #3A2A9E; }
  .muted { color: #6B6880; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #E4E1EE; padding-bottom: 12px; }
  .brand { font-weight: 700; color: #5B3DF5; font-size: 14px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .stat { border: 1px solid #E4E1EE; border-radius: 10px; padding: 10px; }
  .stat .label { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #6B6880; }
  .stat .value { font-size: 17px; font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #6B6880; padding: 6px 8px; border-bottom: 1px solid #E4E1EE; }
  td { padding: 6px 8px; border-bottom: 1px solid #F0EEF6; vertical-align: top; }
  ul { margin: 0; padding-left: 18px; }
  .footer { margin-top: 28px; font-size: 10px; color: #6B6880; border-top: 1px solid #E4E1EE; padding-top: 10px; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
</style></head>
<body>
  <div class="header">
    <div>
      <h1>GLP-1 progress report</h1>
      <div class="muted">${profile.name ? `${escapeHtml(profile.name)} · ` : ''}Generated ${formatMediumDate(now)} · Last ${rangeDays} days · Week ${weeksOn} of treatment</div>
    </div>
    <div class="brand">${escapeHtml(appName)}</div>
  </div>

  <h2>Summary</h2>
  <div class="stats">
    ${stat('Starting weight', formatWeight(summary.startKg, unit), formatMediumDate(journeyStart))}
    ${stat('Current weight', formatWeight(summary.currentKg, unit))}
    ${stat('Total change', formatWeightDelta(-summary.lostKg, unit), `${summary.percentLost.toFixed(1)}% of starting weight`)}
    ${stat('4-week trend', rate === null ? '—' : `${formatWeightDelta(rate, unit)}/wk`)}
    ${stat('BMI', currentBmi ? currentBmi.toFixed(1) : '—', startBmi ? `from ${startBmi.toFixed(1)}` : '')}
    ${stat('Goal weight', formatWeight(summary.goalKg, unit), `${formatWeight(summary.remainingKg, unit)} to go`)}
    ${stat('Avg protein', avgProtein === null ? '—' : `${Math.round(avgProtein)} g/day`, `target ${targets.proteinG} g`)}
    ${stat('Strength training', `${strengthPerWeek.toFixed(1)}×/wk`, `target ${targets.strengthPerWeek}×/wk`)}
  </div>

  <h2>Medications</h2>
  ${medRows ? `<table><thead><tr><th>Medication</th><th>Current dose</th><th>Schedule</th><th>Started</th><th>Doses logged*</th></tr></thead><tbody>${medRows}</tbody></table>` : '<p class="muted">No medications recorded.</p>'}

  <h2>Dose history</h2>
  ${changeRows ? `<table><thead><tr><th>Date</th><th>Medication</th><th>Dose</th></tr></thead><tbody>${changeRows}</tbody></table>` : '<p class="muted">No doses logged yet.</p>'}

  <h2>Weight</h2>
  ${weightChartSvg(weights, unit)}
  ${weightRows ? `<table><thead><tr><th>Date</th><th>Weight</th><th>Change from start</th></tr></thead><tbody>${weightRows}</tbody></table>` : '<p class="muted">No weigh-ins logged yet.</p>'}

  <div class="two">
    <div>
      <h2>Side effects (last ${rangeDays} days)</h2>
      ${symptomRows ? `<table><thead><tr><th>Symptom</th><th>Times logged</th><th>Typical severity</th></tr></thead><tbody>${symptomRows}</tbody></table>` : '<p class="muted">No side effects logged.</p>'}
    </div>
    <div>
      <h2>Nutrition &amp; activity</h2>
      <table><tbody>
        <tr><td>Days with a log</td><td>${logged.length}</td></tr>
        <tr><td>Days protein target met</td><td>${proteinHitDays}</td></tr>
        <tr><td>Strength sessions</td><td>${strengthSessions}</td></tr>
      </tbody></table>
    </div>
  </div>

  ${notes ? `<h2>Dose notes</h2><ul>${notes}</ul>` : ''}

  <div class="footer">
    *Share of scheduled doses logged in the app during this period. This report summarises information the patient
    entered into ${escapeHtml(appName)}; it is not a medical record and has not been verified by a clinician.
  </div>
</body></html>`;
}
