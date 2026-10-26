import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays, atTimeOfDay, parseTimeOfDay, startOfDay } from '@/lib/dates';
import { getPreset } from '@/lib/medications';
import { doseStatus, nextScheduledAfter } from '@/lib/schedule';
import { formatDose } from '@/lib/units';
import type { AppState } from '@/store';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
const CHANNEL_ID = 'reminders';

/** Max reminders queued per medication; iOS caps an app at 64 pending notifications. */
const PER_MED_LIMIT = { daily: 10, other: 6 } as const;

export function configureNotifications() {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      // import/namespace can't follow the package's `export *` of this enum; TypeScript verifies it.
      // eslint-disable-next-line import/namespace
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => {});
  }
}

export async function notificationPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (!supported) return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!current.canAskAgain) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

function schedule(identifier: string, title: string, body: string, trigger: Notifications.NotificationTriggerInput, url = '/') {
  return Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, data: { url }, sound: true },
    trigger,
  });
}

function dateTrigger(date: Date): Notifications.DateTriggerInput {
  return { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID };
}

/**
 * Rebuilds every local reminder from current state. Called after any change that affects
 * reminders and when the app comes to the foreground, so the queue never drifts from the data.
 */
export async function syncReminders(
  state: Pick<AppState, 'medications' | 'doses' | 'settings' | 'profile' | 'pillTimer' | 'meta' | 'premium'>,
) {
  if (!supported || !state.profile) return;
  if ((await notificationPermission()) !== 'granted') return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = new Date();

  for (const med of state.medications) {
    if (!med.active || !med.remindersEnabled) continue;
    const preset = getPreset(med.presetId);
    const status = doseStatus(med, state.doses, now);
    const isPill = med.form === 'pill';
    const title = isPill ? `Time for your ${med.name}` : `${med.name} shot day`;
    const body = isPill
      ? preset.pillRules?.emptyStomach
        ? `${formatDose(med.currentDoseMg)} — take with up to ${preset.pillRules.maxWaterOz ?? 4} oz of water, then wait ${preset.pillRules.waitMinutes ?? 30} min to eat.`
        : `${formatDose(med.currentDoseMg)} — tap to log it.`
      : `${formatDose(med.currentDoseMg)} is due today. Tap to log it and rotate your site.`;

    let next = status.state === 'taken' ? status.nextDueAt : atTimeOfDay(startOfDay(status.nextDueAt), med.reminderTime);
    const limit = med.schedule.kind === 'daily' ? PER_MED_LIMIT.daily : PER_MED_LIMIT.other;
    const startedAt = new Date(med.startedAt);
    let queued = 0;
    for (let i = 0; i < 40 && queued < limit; i++) {
      if (next.getTime() > now.getTime()) {
        await schedule(`dose-${med.id}-${queued}`, title, body, dateTrigger(next), '/log-dose');
        queued++;
      }
      next = nextScheduledAfter(med.schedule, med.reminderTime, next, startedAt);
    }

    // A gentle follow-up the morning after a missed weekly-style dose.
    if (!isPill && med.schedule.kind !== 'daily' && status.state !== 'taken') {
      const followUp = atTimeOfDay(addDays(startOfDay(status.nextDueAt), 1), '10:00');
      if (followUp.getTime() > now.getTime()) {
        await schedule(
          `dose-followup-${med.id}`,
          `Did you take your ${med.name}?`,
          'Log it so your level chart and next dose date stay accurate.',
          dateTrigger(followUp),
          '/log-dose',
        );
      }
    }
  }

  if (state.pillTimer) {
    const med = state.medications.find((m) => m.id === state.pillTimer?.medicationId);
    await schedulePillTimerDone(new Date(state.pillTimer.endsAt), med?.name ?? 'pill');
  }

  if (state.meta.trialEndsAt) {
    const remindAt = atTimeOfDay(addDays(startOfDay(new Date(state.meta.trialEndsAt)), -2), '10:00');
    if (remindAt.getTime() > now.getTime()) {
      await schedule(
        'trial-ending',
        'Your free trial ends in 2 days',
        'You can keep Lifted+ or cancel anytime in Settings › Apple ID › Subscriptions before it renews.',
        dateTrigger(remindAt),
        '/settings',
      );
    }
  }

  const { settings } = state;
  if (settings.weighInReminder) {
    const { hours, minutes } = parseTimeOfDay(settings.weighInTime);
    await schedule(
      'weigh-in',
      'Weekly weigh-in',
      'Same time, same scale. Step on and log it to keep your trend accurate.',
      {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: settings.weighInWeekday + 1,
        hour: hours,
        minute: minutes,
        channelId: CHANNEL_ID,
      },
      '/log-weight',
    );
  }
  if (settings.checkInReminder) {
    const { hours, minutes } = parseTimeOfDay(settings.checkInTime);
    await schedule(
      'check-in',
      'Did you protect your muscle today?',
      'Log your protein and water to keep your Muscle Shield up.',
      { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: hours, minute: minutes, channelId: CHANNEL_ID },
      '/',
    );
  }
}

export async function schedulePillTimerDone(endsAt: Date, medicationName: string) {
  if (!supported || (await notificationPermission()) !== 'granted') return;
  await Notifications.cancelScheduledNotificationAsync('pill-timer').catch(() => {});
  if (endsAt.getTime() <= Date.now()) return;
  await schedule('pill-timer', 'You can eat now', `Your ${medicationName} wait is over. Lead with protein.`, dateTrigger(endsAt));
}

export async function cancelPillTimer() {
  if (!supported) return;
  await Notifications.cancelScheduledNotificationAsync('pill-timer').catch(() => {});
}

/** Deep link from a tapped notification, including the one that cold-launched the app. */
export function addNotificationResponseListener(onUrl: (url: string) => void) {
  if (!supported) return () => {};
  const open = (response: Notifications.NotificationResponse | null) => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string' && url !== '/') onUrl(url);
  };
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      open(response);
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
    })
    .catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}
