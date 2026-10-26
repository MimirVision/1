import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { Brand } from '@/constants/brand';
import { exportCsv } from '@/lib/csv';
import { toDateKey } from '@/lib/dates';
import { computeTargets } from '@/lib/nutrition';
import { buildReportHtml } from '@/lib/report';
import { latestWeight } from '@/lib/weight';
import { useStore } from '@/store';

function downloadOnWeb(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function reportHtml(rangeDays = 90): string | null {
  const state = useStore.getState();
  if (!state.profile) return null;
  const current = latestWeight(state.weights)?.kg ?? state.profile.startWeightKg;
  return buildReportHtml({
    profile: state.profile,
    medications: state.medications,
    doses: state.doses,
    weights: state.weights,
    symptoms: state.symptoms,
    days: state.days,
    targets: { ...computeTargets(state.profile, current), ...state.targetOverrides },
    now: new Date(),
    rangeDays,
    appName: Brand.name,
  });
}

/** Renders the doctor report to PDF and opens the share sheet (print dialog on web). */
export async function shareReport(rangeDays = 90) {
  const html = reportHtml(rangeDays);
  if (!html) return;
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    }
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Share report' });
}

export async function shareCsv() {
  const state = useStore.getState();
  const csv = exportCsv(state);
  const filename = `${Brand.name.toLowerCase()}-export-${toDateKey(new Date())}.csv`;
  if (Platform.OS === 'web') {
    downloadOnWeb(filename, csv, 'text/csv');
    return;
  }
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Export data' });
}
