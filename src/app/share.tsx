import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View, type ViewInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { LineChart } from '@/components/charts/line-chart';
import { LogoMark } from '@/components/logo-mark';
import { Button } from '@/components/ui/button';
import { Chip, Toggle } from '@/components/ui/controls';
import { ModalScreen } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Brand } from '@/constants/brand';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DAY_MS } from '@/lib/dates';
import { formatWeightDelta, kgToDisplay } from '@/lib/units';
import { dailyWeights, doseChanges, weightSummary } from '@/lib/weight';
import { haptics } from '@/services/haptics';
import { useStore } from '@/store';
import { useActiveMedications } from '@/store/selectors';

const THEMES = [
  { id: 'violet', label: 'Violet', colors: ['#5B3DF5', '#8B5CF6', '#C084FC'] as const },
  { id: 'sunset', label: 'Sunset', colors: ['#FF6B4A', '#F2509A', '#8B5CF6'] as const },
  { id: 'ocean', label: 'Ocean', colors: ['#0EA5E9', '#2563EB', '#5B3DF5'] as const },
  { id: 'night', label: 'Night', colors: ['#17151F', '#2A2452', '#5B3DF5'] as const },
];

export default function ShareScreen() {
  const theme = useTheme();
  const profile = useStore((s) => s.profile);
  const weights = useStore((s) => s.weights);
  const doses = useStore((s) => s.doses);
  const primary = useActiveMedications()[0];
  const cardRef = useRef<ViewInstance>(null);
  const [themeId, setThemeId] = useState('violet');
  const [showWeight, setShowWeight] = useState(false);
  const [showMed, setShowMed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => new Date());
  if (!profile) return null;

  const unit = profile.weightUnit === 'st' ? 'lb' : profile.weightUnit;
  const summary = weightSummary(profile.startWeightKg, profile.goalWeightKg, weights);
  const weeks = Math.max(1, Math.round((now.getTime() - Date.parse(profile.journeyStartedAt)) / (7 * DAY_MS)));
  const points = dailyWeights(weights).map((w) => ({ x: Date.parse(w.at), y: kgToDisplay(w.kg, unit) }));
  const palette = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const markers = primary
    ? doseChanges(doses.filter((d) => d.medicationId === primary.id)).map((c) => ({
        x: Date.parse(c.at),
        label: String(c.doseMg),
        color: 'rgba(255,255,255,0.92)',
        labelColor: palette.colors[0],
      }))
    : [];

  const share = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Share from the app', 'Image sharing works in the iPhone app.');
      return;
    }
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      haptics.success();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your progress' });
    } catch (e) {
      Alert.alert('Couldn’t create the image', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalScreen title="Share progress" footer={<Button title="Share image" icon="share" onPress={share} loading={busy} />}>
      <View ref={cardRef} collapsable={false} style={styles.cardWrap}>
        <LinearGradient colors={palette.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={styles.cardTop}>
            <Text variant="overline" tint="rgba(255,255,255,0.8)">
              {weeks} week{weeks === 1 ? '' : 's'}
              {showMed && primary ? ` on ${primary.name}` : ' on my GLP-1'}
            </Text>
          </View>
          <View>
            <Text variant="hero" tint="#fff" rounded tabular style={styles.big}>
              {showWeight ? formatWeightDelta(-summary.lostKg, unit) : `−${Math.max(0, summary.percentLost).toFixed(1)}%`}
            </Text>
            <Text variant="title2" tint="rgba(255,255,255,0.92)">
              {showWeight ? `${summary.percentLost.toFixed(1)}% of my starting weight` : 'body weight lost'}
            </Text>
          </View>
          {points.length >= 2 && (
            <View style={styles.chart}>
              <LineChart
                height={150}
                series={[{ id: 'w', data: points, color: '#FFFFFF', area: true, smooth: true, strokeWidth: 3 }]}
                markers={markers}
                yTickCount={0}
                minYSpan={4}
              />
            </View>
          )}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text variant="title2" tint="#fff" rounded>
                {Math.round(summary.progress * 100)}%
              </Text>
              <Text variant="caption" tint="rgba(255,255,255,0.8)">
                to goal
              </Text>
            </View>
            {markers.length > 0 && (
              <View style={styles.statBox}>
                <Text variant="title2" tint="#fff" rounded>
                  {markers.length}
                </Text>
                <Text variant="caption" tint="rgba(255,255,255,0.8)">
                  dose step{markers.length === 1 ? '' : 's'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.watermark}>
            <LogoMark size={22} color={palette.colors[0]} />
            <Text variant="subhead" weight="700" tint="#fff">
              {Brand.name}
            </Text>
            <Text variant="caption" tint="rgba(255,255,255,0.75)">
              · GLP-1 tracker
            </Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.chips}>
        {THEMES.map((t) => (
          <Chip key={t.id} label={t.label} selected={t.id === themeId} onPress={() => setThemeId(t.id)} />
        ))}
      </View>
      <View style={[styles.options, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.optionRow}>
          <Text variant="callout" weight="500" style={styles.flex}>
            Show pounds/kilos lost
          </Text>
          <Toggle value={showWeight} onValueChange={setShowWeight} />
        </View>
        <View style={[styles.optionRow, { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
          <Text variant="callout" weight="500" style={styles.flex}>
            Show medication name
          </Text>
          <Toggle value={showMed} onValueChange={setShowMed} />
        </View>
      </View>
      <Text variant="caption" color="textTertiary" align="center">
        Your actual weight is never shown on the image.
      </Text>
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cardWrap: { borderRadius: Radius.xl, overflow: 'hidden', alignSelf: 'center', width: '100%', maxWidth: 360 },
  card: { aspectRatio: 9 / 14, padding: Spacing.xxl, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row' },
  big: { fontSize: 64, lineHeight: 70 },
  chart: { marginHorizontal: -Spacing.md },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statBox: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  watermark: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  options: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, minHeight: 54 },
});
