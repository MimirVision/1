import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';

import { useStore } from '@/store';

const MIN_DAYS_BETWEEN = 120;

/**
 * Asks for an App Store rating at a moment of success (a milestone or a streak). Apple rate-limits
 * the prompt itself; we additionally wait for some real usage and space requests out.
 */
export async function maybeRequestReview() {
  if (Platform.OS === 'web') return;
  const { meta, doses, weights, markReviewRequested } = useStore.getState();
  if (meta.appOpens < 4 || doses.length + weights.length < 4) return;
  if (meta.reviewRequestedAt) {
    const days = (Date.now() - Date.parse(meta.reviewRequestedAt)) / 86_400_000;
    if (days < MIN_DAYS_BETWEEN) return;
  }
  try {
    if (await StoreReview.hasAction()) {
      await StoreReview.requestReview();
      markReviewRequested();
    }
  } catch {
    // Not available (e.g. simulator without StoreKit) — ignore.
  }
}
