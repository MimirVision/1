import { useMemo } from 'react';

import { useTheme } from '@/hooks/use-theme';
import { DAY_MS, formatMediumDate, formatShortDate } from '@/lib/dates';
import type { DoseLog, WeightLog } from '@/lib/types';
import { formatDose, kgToDisplay, weightUnitLabel, type WeightUnit } from '@/lib/units';
import { dailyWeights, doseChanges, doseInEffectAt } from '@/lib/weight';

import { LineChart, TooltipText } from '../charts/line-chart';

export function WeightChart({
  weights,
  doses,
  unit,
  goalKg,
  rangeDays,
  now,
  height = 210,
  showGoal = true,
}: {
  weights: WeightLog[];
  doses: DoseLog[];
  unit: WeightUnit;
  goalKg?: number;
  /** null = all time */
  rangeDays: number | null;
  now: Date;
  height?: number;
  showGoal?: boolean;
}) {
  const theme = useTheme();
  const { points, from, to, markers } = useMemo(() => {
    const daily = dailyWeights(weights);
    const first = daily[0] ? Date.parse(daily[0].at) : now.getTime() - 30 * DAY_MS;
    const start = rangeDays === null ? first : now.getTime() - rangeDays * DAY_MS;
    const visible = daily.filter((w) => Date.parse(w.at) >= start);
    // Keep the line anchored at the left edge by including the last point before the range.
    const before = [...daily].reverse().find((w) => Date.parse(w.at) < start);
    const series = (before ? [before, ...visible] : visible).map((w) => ({ x: Date.parse(w.at), y: kgToDisplay(w.kg, unit) }));
    const domainStart = rangeDays === null ? Math.min(first, now.getTime() - 7 * DAY_MS) : start;
    return {
      points: series,
      from: domainStart,
      to: now.getTime(),
      markers: doseChanges(doses)
        .filter((c) => Date.parse(c.at) >= domainStart)
        .map((c) => ({ x: Date.parse(c.at), label: String(c.doseMg) })),
    };
  }, [weights, doses, unit, rangeDays, now]);

  const label = weightUnitLabel(unit);
  return (
    <LineChart
      height={height}
      series={[{ id: 'weight', data: points, color: theme.primary, area: true, smooth: true, dots: points.length <= 12 }]}
      markers={markers.map((m) => ({ ...m, color: theme.level }))}
      goal={showGoal && goalKg ? { y: kgToDisplay(goalKg, unit), label: 'Goal' } : undefined}
      xDomain={[from, to]}
      minYSpan={unit === 'kg' ? 2 : 4}
      formatY={(y) => y.toFixed(0)}
      formatX={(x) => formatShortDate(new Date(x))}
      renderTooltip={(p) => {
        const dose = doseInEffectAt(doses, p.x);
        return (
          <TooltipText
            title={`${formatMediumDate(new Date(p.x))}${dose ? ` · ${formatDose(dose.doseMg)}` : ''}`}
            value={`${p.y.toFixed(1)} ${label}`}
          />
        );
      }}
    />
  );
}
