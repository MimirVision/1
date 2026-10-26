import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Text } from '../ui/text';

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartSeries {
  id: string;
  data: ChartPoint[];
  color: string;
  strokeWidth?: number;
  dashed?: boolean;
  area?: boolean;
  smooth?: boolean;
  dots?: boolean;
  /** Excluded from scrubbing. */
  passive?: boolean;
}

export interface ChartMarker {
  x: number;
  label?: string;
  color?: string;
  /** Label text color (defaults to white on the marker color). */
  labelColor?: string;
}

interface LineChartProps {
  series: ChartSeries[];
  height?: number;
  markers?: ChartMarker[];
  goal?: { y: number; label: string };
  nowX?: number;
  xDomain?: [number, number];
  yDomain?: [number, number];
  /** Minimum visible y-range so a flat line doesn't fill the chart. */
  minYSpan?: number;
  formatY?: (y: number) => string;
  formatX?: (x: number) => string;
  /** Tooltip contents for a scrubbed point. */
  renderTooltip?: (point: ChartPoint, series: ChartSeries) => ReactNode;
  yTickCount?: number;
  xTicks?: number[];
}

const BASE_PAD = { top: 14, right: 12, bottom: 24, left: 38 };

/** Monotone cubic (Fritsch–Carlson) path so smoothed lines never overshoot the data. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 3) return linearPath(points);
  const n = points.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    slope.push((points[i + 1].y - points[i].y) / (dx[i] || 1e-9));
  }
  const m: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) m.push(0);
    else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      m.push((w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]));
    }
  }
  m.push(slope[n - 2]);
  let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const h = dx[i] / 3;
    d += ` C${(p0.x + h).toFixed(2)},${(p0.y + m[i] * h).toFixed(2)} ${(p1.x - h).toFixed(2)},${(p1.y - m[i + 1] * h).toFixed(2)} ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
  }
  return d;
}

function linearPath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

function niceTicks(min: number, max: number, count: number): number[] {
  const span = max - min;
  if (span <= 0) return [min];
  const raw = span / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

export function LineChart({
  series,
  height = 200,
  markers = [],
  goal,
  nowX,
  xDomain,
  yDomain,
  minYSpan = 1,
  formatY = (y) => y.toFixed(0),
  formatX,
  renderTooltip,
  yTickCount = 3,
  xTicks,
}: LineChartProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [scrub, setScrub] = useState<{ point: ChartPoint; series: ChartSeries } | null>(null);

  const all = series.flatMap((s) => s.data);
  const [x0, x1] = useMemo<[number, number]>(() => {
    if (xDomain) return xDomain;
    if (all.length === 0) return [0, 1];
    return [Math.min(...all.map((p) => p.x)), Math.max(...all.map((p) => p.x))];
  }, [xDomain, all]);

  const [y0, y1] = useMemo<[number, number]>(() => {
    if (yDomain) return yDomain;
    const ys = all.map((p) => p.y);
    if (goal) ys.push(goal.y);
    if (ys.length === 0) return [0, 1];
    let lo = Math.min(...ys);
    let hi = Math.max(...ys);
    if (hi - lo < minYSpan) {
      const mid = (hi + lo) / 2;
      lo = mid - minYSpan / 2;
      hi = mid + minYSpan / 2;
    }
    const pad = (hi - lo) * 0.12;
    return [lo - pad, hi + pad];
  }, [yDomain, all, goal, minYSpan]);

  // Without axis labels the plot can use the full width/height.
  const PAD = {
    top: markers.some((m) => m.label) ? BASE_PAD.top + 10 : 6,
    right: BASE_PAD.right,
    bottom: formatX ? BASE_PAD.bottom : 6,
    left: yTickCount > 0 ? BASE_PAD.left : 6,
  };
  const plotW = Math.max(1, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const sx = (x: number) => PAD.left + ((x - x0) / Math.max(1e-9, x1 - x0)) * plotW;
  const sy = (y: number) => PAD.top + (1 - (y - y0) / Math.max(1e-9, y1 - y0)) * plotH;

  const yTicks = yTickCount > 0 ? niceTicks(y0, y1, yTickCount) : [];
  const xTickValues = xTicks ?? (formatX ? [x0, (x0 + x1) / 2, x1] : []);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const scrubbable = series.filter((s) => !s.passive && s.data.length > 0);
  const handleTouch = (e: GestureResponderEvent) => {
    if (!renderTooltip || scrubbable.length === 0 || width === 0) return;
    const touchX = e.nativeEvent.locationX;
    const x = x0 + ((touchX - PAD.left) / plotW) * (x1 - x0);
    let best: { point: ChartPoint; series: ChartSeries; dist: number } | null = null;
    for (const s of scrubbable) {
      for (const p of s.data) {
        const dist = Math.abs(p.x - x);
        if (!best || dist < best.dist) best = { point: p, series: s, dist };
      }
    }
    if (best) setScrub({ point: best.point, series: best.series });
  };

  return (
    <View
      onLayout={onLayout}
      style={{ height }}
      onStartShouldSetResponder={() => !!renderTooltip}
      onMoveShouldSetResponder={() => !!renderTooltip}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      onResponderRelease={() => setScrub(null)}
      onResponderTerminate={() => setScrub(null)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            {series
              .filter((s) => s.area)
              .map((s) => (
                <LinearGradient key={s.id} id={`grad-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={s.color} stopOpacity={0.28} />
                  <Stop offset="1" stopColor={s.color} stopOpacity={0} />
                </LinearGradient>
              ))}
          </Defs>

          {yTicks.map((t) => (
            <G key={`y-${t}`}>
              <Line x1={PAD.left} x2={width - PAD.right} y1={sy(t)} y2={sy(t)} stroke={theme.border} strokeWidth={1} strokeDasharray="3 4" />
              <SvgText x={PAD.left - 6} y={sy(t) + 4} fontSize={10} fill={theme.textTertiary} textAnchor="end" fontFamily={Fonts.sans}>
                {formatY(t)}
              </SvgText>
            </G>
          ))}

          {formatX &&
            xTickValues.map((t, i) => (
              <SvgText
                key={`x-${t}`}
                x={sx(t)}
                y={height - 6}
                fontSize={10}
                fill={theme.textTertiary}
                fontFamily={Fonts.sans}
                textAnchor={i === 0 ? 'start' : i === xTickValues.length - 1 ? 'end' : 'middle'}>
                {formatX(t)}
              </SvgText>
            ))}

          {markers.map((m, i) => {
            const x = sx(m.x);
            if (x < PAD.left - 1 || x > width - PAD.right + 1) return null;
            return (
              <G key={`m-${i}`}>
                <Line x1={x} x2={x} y1={PAD.top} y2={PAD.top + plotH} stroke={m.color ?? theme.level} strokeWidth={1} strokeOpacity={0.5} strokeDasharray="2 3" />
                {m.label
                  ? (() => {
                      // Keep the pill inside the chart even for markers at the edges.
                      const cx = Math.min(Math.max(x, 18), width - 18);
                      return (
                        <G>
                          <Rect x={cx - 18} y={PAD.top - 12} width={36} height={15} rx={7.5} fill={m.color ?? theme.level} />
                          <SvgText x={cx} y={PAD.top - 1} fontSize={9} fontWeight="700" fill={m.labelColor ?? '#FFFFFF'} textAnchor="middle" fontFamily={Fonts.sans}>
                            {m.label}
                          </SvgText>
                        </G>
                      );
                    })()
                  : null}
              </G>
            );
          })}

          {goal && (
            <G>
              <Line x1={PAD.left} x2={width - PAD.right} y1={sy(goal.y)} y2={sy(goal.y)} stroke={theme.success} strokeWidth={1.5} strokeDasharray="6 4" />
              <SvgText x={width - PAD.right} y={sy(goal.y) - 5} fontSize={10} fontWeight="700" fill={theme.success} textAnchor="end" fontFamily={Fonts.sans}>
                {goal.label}
              </SvgText>
            </G>
          )}

          {series.map((s) => {
            if (s.data.length === 0) return null;
            const pts = s.data.map((p) => ({ x: sx(p.x), y: sy(p.y) }));
            const d = s.smooth ? smoothPath(pts) : linearPath(pts);
            const areaD = `${d} L${pts[pts.length - 1].x.toFixed(2)},${(PAD.top + plotH).toFixed(2)} L${pts[0].x.toFixed(2)},${(PAD.top + plotH).toFixed(2)} Z`;
            return (
              <G key={s.id}>
                {s.area && pts.length > 1 && <Path d={areaD} fill={`url(#grad-${s.id})`} />}
                <Path
                  d={d}
                  stroke={s.color}
                  strokeWidth={s.strokeWidth ?? 2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={s.dashed ? '5 5' : undefined}
                />
                {(s.dots || pts.length === 1) &&
                  pts.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={3} fill={theme.surface} stroke={s.color} strokeWidth={2} />)}
              </G>
            );
          })}

          {nowX !== undefined && sx(nowX) >= PAD.left && sx(nowX) <= width - PAD.right && (
            <Line x1={sx(nowX)} x2={sx(nowX)} y1={PAD.top} y2={PAD.top + plotH} stroke={theme.textTertiary} strokeWidth={1} />
          )}

          {scrub && (
            <G>
              <Line x1={sx(scrub.point.x)} x2={sx(scrub.point.x)} y1={PAD.top} y2={PAD.top + plotH} stroke={theme.text} strokeOpacity={0.25} strokeWidth={1} />
              <Circle cx={sx(scrub.point.x)} cy={sy(scrub.point.y)} r={5.5} fill={scrub.series.color} stroke={theme.surface} strokeWidth={2.5} />
            </G>
          )}
        </Svg>
      )}
      {scrub && renderTooltip && (
        <View
          pointerEvents="none"
          style={[
            styles.tooltip,
            {
              backgroundColor: theme.text,
              left: Math.min(Math.max(0, sx(scrub.point.x) - 70), Math.max(0, width - 140)),
            },
          ]}>
          {renderTooltip(scrub.point, scrub.series)}
        </View>
      )}
    </View>
  );
}

export function TooltipText({ title, value }: { title: string; value: string }) {
  const theme = useTheme();
  return (
    <>
      <Text variant="caption" tint={theme.background} style={{ opacity: 0.7 }}>
        {title}
      </Text>
      <Text variant="subhead" weight="700" tint={theme.background}>
        {value}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    top: -6,
    width: 140,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
});
