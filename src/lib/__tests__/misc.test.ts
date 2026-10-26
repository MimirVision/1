import { exportCsv, csvCell } from '../csv';
import { calendarDaysBetween, formatCountdown, formatRelativeDay, formatTimer, toDateKey, fromDateKey } from '../dates';
import { getPreset, MEDICATION_PRESETS, nextDoseUp, scheduleIntervalDays, trialFor } from '../medications';
import { goalPercent, trialCurvePercent, trialProjection } from '../projection';
import { buildReportHtml, escapeHtml, weightChartSvg } from '../report';
import { suggestNextSite } from '../sites';
import { daysSinceDose, patternInsight, symptomCounts, symptomPatterns } from '../symptoms';
import { tipFor } from '../tips';
import type { DoseLog, Medication, Profile, SymptomLog } from '../types';
import { bmi, formatDose, formatWeight, formatWeightDelta, ftInToCm, cmToFtIn, lbToKg } from '../units';

describe('units', () => {
  it('formats weights in every unit', () => {
    expect(formatWeight(lbToKg(182.4), 'lb')).toBe('182.4 lb');
    expect(formatWeight(82.7, 'kg')).toBe('82.7 kg');
    expect(formatWeight(lbToKg(14 * 13 + 2), 'st')).toBe('13 st 2.0 lb');
    expect(formatWeightDelta(-lbToKg(12.4), 'lb')).toBe('−12.4 lb');
    expect(formatWeightDelta(lbToKg(1), 'st')).toBe('+1.0 lb');
  });

  it('round-trips height and computes BMI', () => {
    expect(cmToFtIn(ftInToCm(5, 7))).toEqual({ feet: 5, inches: 7 });
    expect(bmi(70, 175)).toBeCloseTo(22.86, 2);
    expect(bmi(70, 0)).toBeNull();
  });

  it('formats doses without float noise', () => {
    expect(formatDose(2.5)).toBe('2.5 mg');
    expect(formatDose(0.25)).toBe('0.25 mg');
    expect(formatDose(15)).toBe('15 mg');
  });
});

describe('dates', () => {
  const now = new Date(2026, 2, 4, 12);
  it('describes relative days', () => {
    expect(formatRelativeDay(new Date(2026, 2, 4, 20), now)).toBe('Today');
    expect(formatRelativeDay(new Date(2026, 2, 5), now)).toBe('Tomorrow');
    expect(formatRelativeDay(new Date(2026, 2, 3), now)).toBe('Yesterday');
    expect(formatRelativeDay(new Date(2026, 2, 7), now)).toBe('Saturday');
    expect(formatRelativeDay(new Date(2026, 2, 20), now)).toBe('In 16 days');
    expect(formatRelativeDay(new Date(2026, 2, 1), now)).toBe('3 days ago');
  });

  it('formats countdowns and timers', () => {
    expect(formatCountdown(2 * 86_400_000 + 4 * 3_600_000)).toBe('2d 4h');
    expect(formatCountdown(5 * 3_600_000 + 12 * 60_000)).toBe('5h 12m');
    expect(formatTimer(29 * 60_000 + 5_000)).toBe('29:05');
  });

  it('round-trips date keys', () => {
    expect(toDateKey(fromDateKey('2026-11-01'))).toBe('2026-11-01');
    expect(calendarDaysBetween(new Date(2026, 2, 1, 23), new Date(2026, 2, 2, 1))).toBe(1);
  });
});

describe('medication catalog', () => {
  it('has unique ids and ascending dose ladders', () => {
    const ids = MEDICATION_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of MEDICATION_PRESETS) {
      const sorted = [...preset.doses].sort((a, b) => a - b);
      expect(preset.doses).toEqual(sorted);
    }
  });

  it('steps up the ladder', () => {
    expect(nextDoseUp(getPreset('zepbound'), 5)).toBe(7.5);
    expect(nextDoseUp(getPreset('zepbound'), 15)).toBeUndefined();
  });

  it('uses the high-dose trial for Wegovy 7.2 mg', () => {
    expect(trialFor('semaglutide', 2.4)?.name).toBe('STEP 1');
    expect(trialFor('semaglutide', 7.2)?.name).toBe('STEP UP');
  });

  it('falls back to the custom preset', () => {
    expect(getPreset('nope').id).toBe('other');
    expect(scheduleIntervalDays({ kind: 'weekdays', days: [1, 4] })).toBe(3.5);
  });
});

describe('projection', () => {
  it('hits the trial mean at the endpoint and is monotonic', () => {
    const projection = trialProjection('tirzepatide', 100, 75)!;
    expect(projection.endKg).toBeCloseTo(79.1, 1);
    for (let i = 1; i < projection.points.length; i++) {
      expect(projection.points[i].kg).toBeLessThanOrEqual(projection.points[i - 1].kg);
    }
    expect(projection.goalWeek).toBeNull();
    expect(trialProjection('tirzepatide', 100, 90)!.goalWeek).toBeGreaterThan(0);
    expect(trialProjection('other', 100, 90)).toBeNull();
  });

  it('front-loads loss like the trials', () => {
    const trial = trialFor('semaglutide')!;
    expect(trialCurvePercent(trial, trial.weeks / 2)).toBeGreaterThan(trial.meanPercentLoss * 0.7);
    expect(goalPercent(100, 85)).toBe(15);
  });
});

describe('sites', () => {
  const dose = (site: DoseLog['site'], day: number): DoseLog => ({
    id: `${day}`,
    medicationId: 'm',
    takenAt: new Date(2026, 0, day).toISOString(),
    doseMg: 5,
    site,
  });

  it('suggests an unused site first, then the least recently used', () => {
    expect(suggestNextSite([])).toBe('abdomen_upper_left');
    expect(suggestNextSite([dose('abdomen_upper_left', 1)])).toBe('abdomen_upper_right');
    const all = (
      ['abdomen_upper_left', 'abdomen_upper_right', 'abdomen_lower_left', 'abdomen_lower_right', 'thigh_left', 'thigh_right', 'arm_left', 'arm_right'] as const
    ).map((s, i) => dose(s, i + 1));
    expect(suggestNextSite([...all, dose('abdomen_upper_left', 20)])).toBe('abdomen_upper_right');
  });
});

describe('symptoms', () => {
  const dayMs = 86_400_000;
  const base = new Date(2026, 0, 5, 9).getTime();
  const doses: DoseLog[] = [0, 7, 14].map((w) => ({
    id: `${w}`,
    medicationId: 'm',
    takenAt: new Date(base + w * dayMs).toISOString(),
    doseMg: 5,
  }));
  const log = (day: number, symptoms: SymptomLog['symptoms']): SymptomLog => ({
    id: `${day}`,
    at: new Date(base + day * dayMs + 3_600_000).toISOString(),
    symptoms,
  });

  it('buckets check-ins by day after the dose', () => {
    expect(daysSinceDose(doses.map((d) => Date.parse(d.takenAt)), base + 2.5 * dayMs)).toBe(2);
    expect(daysSinceDose([], base)).toBeNull();
  });

  it('finds a peak day and writes an insight', () => {
    const logs = [
      log(2, { nausea: 3 }),
      log(9, { nausea: 2 }),
      log(16, { nausea: 3 }),
      log(4, {}),
      log(11, { fatigue: 1 }),
      log(5, {}),
    ];
    const patterns = symptomPatterns(logs, doses);
    const nausea = patterns.find((p) => p.symptom === 'nausea')!;
    expect(nausea.peakDay).toBe(2);
    expect(patternInsight(nausea)).toBe('Nausea tends to peak on day 2 after your dose.');
    expect(patternInsight(patterns.find((p) => p.symptom === 'fatigue')!)).toBeNull();
    expect(symptomCounts(logs, 0)[0]).toEqual({ symptom: 'nausea', count: 3, avgSeverity: 8 / 3 });
  });
});

describe('tips', () => {
  const ctx = {
    form: 'injection' as const,
    daysSinceDose: 1,
    recentIncrease: false,
    proteinRemainingG: 10,
    hour: 9,
    strengthThisWeek: 0,
    strengthTarget: 2,
    concerns: [],
    dayIndex: 3,
  };
  it('prioritises dose increases, protein gaps, then dose-day context', () => {
    expect(tipFor({ ...ctx, recentIncrease: true }).id).toBe('increase');
    expect(tipFor({ ...ctx, hour: 17, proteinRemainingG: 60 }).id).toBe('protein-gap');
    expect(tipFor(ctx).id).toBe('peak-days');
    expect(tipFor({ ...ctx, daysSinceDose: 6 }).id).toBe('tail-days');
    expect(tipFor({ ...ctx, daysSinceDose: 3, concerns: ['muscle'] }).id).toBe('lift');
    expect(tipFor({ ...ctx, form: null }).id).toBeTruthy();
  });
});

const profile: Profile = {
  name: 'Sam <script>',
  sex: 'female',
  heightCm: 168,
  startWeightKg: 100,
  goalWeightKg: 75,
  goal: 'lose',
  concerns: ['muscle'],
  strengthHabit: 'sometimes',
  weightUnit: 'lb',
  volumeUnit: 'oz',
  heightUnit: 'ftin',
  journeyStartedAt: new Date(2026, 0, 5).toISOString(),
};
const medication: Medication = {
  id: 'm',
  presetId: 'zepbound',
  name: 'Zepbound',
  compound: 'tirzepatide',
  form: 'injection',
  currentDoseMg: 5,
  schedule: { kind: 'weekly', weekday: 1 },
  reminderTime: '09:00',
  remindersEnabled: true,
  startedAt: new Date(2026, 0, 5).toISOString(),
  active: true,
  createdAt: new Date(2026, 0, 5).toISOString(),
};

describe('report', () => {
  const doses: DoseLog[] = [
    { id: '1', medicationId: 'm', takenAt: new Date(2026, 0, 5, 9).toISOString(), doseMg: 2.5, note: 'Felt "fine" & ok' },
    { id: '2', medicationId: 'm', takenAt: new Date(2026, 1, 2, 9).toISOString(), doseMg: 5 },
  ];
  const weights = [
    { id: 'a', at: new Date(2026, 0, 5).toISOString(), kg: 100 },
    { id: 'b', at: new Date(2026, 1, 20).toISOString(), kg: 93 },
  ];

  it('includes the key numbers and escapes user text', () => {
    const html = buildReportHtml({
      profile,
      medications: [medication],
      doses,
      weights,
      symptoms: [{ id: 's', at: new Date(2026, 1, 3).toISOString(), symptoms: { nausea: 2 } }],
      days: {},
      targets: { proteinG: 100, waterMl: 2500, fiberG: 25, strengthPerWeek: 2 },
      now: new Date(2026, 1, 21),
      appName: 'Lifted',
    });
    expect(html).toContain('Zepbound');
    expect(html).toContain('2.5 mg');
    expect(html).toContain('7.0% of starting weight');
    expect(html).toContain('Nausea');
    expect(html).toContain('Sam &lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('Felt &quot;fine&quot; &amp; ok');
    expect(html).toContain('<svg');
  });

  it('skips the chart with fewer than two weigh-ins', () => {
    expect(weightChartSvg([weights[0]], 'lb')).toBe('');
    expect(escapeHtml(`<a href='x'>`)).toBe('&lt;a href=&#39;x&#39;&gt;');
  });
});

describe('csv', () => {
  it('escapes cells and orders rows by time', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    const csv = exportCsv({
      medications: [medication],
      doses: [{ id: '1', medicationId: 'm', takenAt: new Date(2026, 0, 6, 9).toISOString(), doseMg: 2.5 }],
      weights: [{ id: 'w', at: new Date(2026, 0, 5, 7).toISOString(), kg: 100 }],
      days: { '2026-01-07': { date: '2026-01-07', proteinG: 90, waterMl: 2000, fiberG: 20, strength: true } },
      symptoms: [{ id: 's', at: new Date(2026, 0, 8, 9).toISOString(), symptoms: { nausea: 2 }, note: 'meh' }],
    });
    const lines = csv.split('\n');
    expect(lines[0].startsWith('type,date,time')).toBe(true);
    expect(lines.slice(1).map((l) => l.split(',')[0])).toEqual(['weight', 'dose', 'nutrition', 'check_in']);
    expect(csv).toContain('Nausea (2)');
  });
});
