import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeDay } from '@/lib/dates';
import { INJECTION_SITES, siteInfo } from '@/lib/sites';
import type { InjectionSiteId } from '@/lib/types';
import { haptics } from '@/services/haptics';

import { Text } from '../ui/text';

const W = 200;
const H = 300;

/** Front-view silhouette with tappable injection sites. */
export function BodyMap({
  selected,
  suggested,
  lastUsed,
  onSelect,
  now,
}: {
  selected?: InjectionSiteId;
  suggested?: InjectionSiteId;
  lastUsed: Partial<Record<InjectionSiteId, number>>;
  onSelect?: (site: InjectionSiteId) => void;
  now: Date;
}) {
  const theme = useTheme();
  const skin = theme.surfaceSunken;
  return (
    <View style={styles.wrap}>
      <View style={{ width: W, height: H }}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* head + neck */}
          <Circle cx={100} cy={30} r={20} fill={skin} />
          <Rect x={92} y={46} width={16} height={12} rx={4} fill={skin} />
          {/* torso */}
          <Path d="M62 62 Q100 52 138 62 L146 150 Q140 170 128 176 L72 176 Q60 170 54 150 Z" fill={skin} />
          {/* arms */}
          <Path d="M60 64 Q44 70 38 96 L28 150 Q26 160 34 162 Q42 162 44 152 L56 104 Z" fill={skin} />
          <Path d="M140 64 Q156 70 162 96 L172 150 Q174 160 166 162 Q158 162 156 152 L144 104 Z" fill={skin} />
          {/* legs */}
          <Path d="M72 174 L98 174 L96 288 Q96 296 86 296 Q78 296 78 288 Z" fill={skin} />
          <Path d="M102 174 L128 174 L122 288 Q122 296 114 296 Q104 296 104 288 Z" fill={skin} />
          {/* navel: avoid ~2 inches around it */}
          <Ellipse cx={100} cy={128} rx={10} ry={8} fill={theme.surface} opacity={0.7} />
        </Svg>
        {INJECTION_SITES.map((site) => {
          const isSelected = site.id === selected;
          const isSuggested = site.id === suggested && !selected;
          const used = lastUsed[site.id];
          const size = isSelected ? 30 : 24;
          const color = isSelected ? theme.primary : isSuggested ? theme.success : used ? theme.textTertiary : theme.surface;
          return (
            <Pressable
              key={site.id}
              accessibilityRole="button"
              accessibilityLabel={`${site.label}${used ? `, last used ${formatRelativeDay(new Date(used), now)}` : ''}`}
              accessibilityState={{ selected: isSelected }}
              disabled={!onSelect}
              hitSlop={6}
              onPress={() => {
                haptics.tap();
                onSelect?.(site.id);
              }}
              style={[
                styles.dot,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  left: site.x * W - size / 2,
                  top: site.y * H - size / 2,
                  backgroundColor: color,
                  borderColor: isSelected ? theme.primarySoft : isSuggested ? theme.successSoft : theme.border,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.legend}>
        <Legend color={theme.success} label="Suggested" />
        {onSelect && <Legend color={theme.primary} label="Selected" />}
        <Legend color={theme.textTertiary} label="Used before" />
      </View>
      {(selected || suggested) && (
        <Text variant="subhead" align="center" color="textSecondary">
          {selected ? siteInfo(selected).label : `Rotate to: ${siteInfo(suggested!).label}`}
          {selected && lastUsed[selected] ? ` · last used ${formatRelativeDay(new Date(lastUsed[selected]!), now).toLowerCase()}` : ''}
        </Text>
      )}
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.md },
  dot: { position: 'absolute', borderWidth: 3 },
  legend: { flexDirection: 'row', gap: Spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: Radius.pill },
});
