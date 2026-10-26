import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DAY_MS, formatClock, formatShortDate, HOUR_MS } from '@/lib/dates';
import { getCompound, scheduleIntervalDays } from '@/lib/medications';
import { levelAt, levelSeries, levelTrend, pkParams, steadyStatePeak, type LevelTrend } from '@/lib/pk';
import { dosesForMedication, projectedDoses } from '@/lib/schedule';
import type { DoseLog, Medication } from '@/lib/types';
import { formatDose } from '@/lib/units';
import { doseChanges } from '@/lib/weight';

import { LineChart, TooltipText, type ChartMarker } from '../charts/line-chart';

export interface LevelData {
  supported: boolean;
  unit: 'mg' | 'percent';
  current: number;
  trend: LevelTrend;
  past: { x: number; y: number }[];
  future: { x: number; y: number }[];
  markers: ChartMarker[];
  from: number;
  to: number;
  /** Current level as a share of the expected steady-state peak at the current dose. */
  ofPeak: number | null;
}

export function formatLevel(value: number, unit: 'mg' | 'percent'): string {
  if (unit === 'percent') return `${Math.round(value)}%`;
  return value >= 10 ? `${value.toFixed(1)} mg` : `${value.toFixed(2)} mg`;
}

export function computeLevelData(medication: Medication, allDoses: DoseLog[], now: Date, rangeDays: number): LevelData {
  const compound = getCompound(medication.compound);
  const empty: LevelData = {
    supported: false,
    unit: compound.levelUnit,
    current: 0,
    trend: 'steady',
    past: [],
    future: [],
    markers: [],
    from: now.getTime(),
    to: now.getTime(),
    ofPeak: null,
  };
  if (!compound.halfLifeHours || !compound.tmaxHours) return empty;

  const params = pkParams(compound.halfLifeHours, compound.tmaxHours);
  const doses = dosesForMedication(allDoses, medication.id);
  const from = now.getTime() - rangeDays * 0.72 * DAY_MS;
  const to = now.getTime() + rangeDays * 0.28 * DAY_MS;
  const logged = doses.map((d) => ({ time: Date.parse(d.takenAt), mg: d.doseMg }));
  const future = projectedDoses(medication, doses, now, new Date(to));
  const combined = [...logged, ...future];

  const intervalHours = scheduleIntervalDays(medication.schedule) * 24;
  const peak = steadyStatePeak(medication.currentDoseMg, intervalHours, params);
  const scale = compound.levelUnit === 'percent' ? (peak > 0 ? 100 / peak : 0) : 1;
  const step = Math.max(HOUR_MS, Math.round(((to - from) / 220) / HOUR_MS) * HOUR_MS);

  const pastSeries = levelSeries(logged, params, from, now.getTime(), step).map((p) => ({ x: p.t, y: p.value * scale }));
  const futureSeries = levelSeries(combined, params, now.getTime(), to, step).map((p) => ({ x: p.t, y: p.value * scale }));
  const current = levelAt(logged, now.getTime(), params);

  const markers: ChartMarker[] = doseChanges(doses)
    .filter((c) => Date.parse(c.at) >= from)
    .map((c) => ({ x: Date.parse(c.at), label: String(c.doseMg) }));

  return {
    supported: true,
    unit: compound.levelUnit,
    current: current * scale,
    trend: levelTrend(logged, now.getTime(), params),
    past: pastSeries,
    future: futureSeries,
    markers,
    from,
    to,
    ofPeak: peak > 0 ? current / peak : null,
  };
}

const LEVEL_REFRESH_MS = 5 * 60_000;

export function useLevelData(medication: Medication | undefined, doses: DoseLog[], now: Date, rangeDays: number) {
  // Recompute at most every few minutes — the curve doesn't change faster than that.
  const tick = Math.floor(now.getTime() / LEVEL_REFRESH_MS);
  return useMemo(
    () => (medication ? computeLevelData(medication, doses, new Date(tick * LEVEL_REFRESH_MS), rangeDays) : null),
    [medication, doses, rangeDays, tick],
  );
}

export function LevelChart({ data, height = 190, now }: { data: LevelData; height?: number; now: Date }) {
  const theme = useTheme();
  const spanDays = (data.to - data.from) / DAY_MS;
  return (
    <View style={styles.wrap}>
      <LineChart
        height={height}
        series={[
          { id: 'past', data: data.past, color: theme.level, area: true, strokeWidth: 2.5 },
          { id: 'future', data: data.future, color: theme.level, dashed: true, strokeWidth: 2, passive: false },
        ]}
        markers={data.markers.map((m) => ({ ...m, label: m.label ? `${m.label}` : undefined, color: theme.level }))}
        nowX={now.getTime()}
        xDomain={[data.from, data.to]}
        minYSpan={data.unit === 'percent' ? 20 : 0.5}
        formatY={(y) => (data.unit === 'percent' ? `${Math.round(y)}%` : Number.isInteger(y) ? String(y) : y.toFixed(1))}
        formatX={(x) => formatShortDate(new Date(x))}
        xTicks={[data.from, now.getTime(), data.to]}
        renderTooltip={(p, s) => (
          <TooltipText
            title={`${s.id === 'future' && p.x > now.getTime() ? 'Projected · ' : ''}${formatShortDate(new Date(p.x))}${spanDays <= 21 ? `, ${formatClock(new Date(p.x))}` : ''}`}
            value={formatLevel(p.y, data.unit)}
          />
        )}
      />
    </View>
  );
}

export function levelHeadline(data: LevelData, medication: Medication): string {
  const trend = data.trend === 'rising' ? 'rising' : data.trend === 'falling' ? 'tapering' : 'steady';
  if (data.current <= 0) return `Log your first ${formatDose(medication.currentDoseMg)} dose to see your level`;
  return `Estimated level is ${trend}`;
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: -Spacing.xs },
});
