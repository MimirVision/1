import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { maybeLoadDemoFromUrl } from '@/store/demo';
import { useStore } from '@/store';
import { addNotificationResponseListener, configureNotifications, syncReminders } from '@/services/notifications';
import { configurePurchases, refreshEntitlement } from '@/services/purchases';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

function resync() {
  const s = useStore.getState();
  syncReminders(s).catch(() => {});
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const hydrated = useStore((s) => s.hydrated);
  const onboarded = useStore((s) => s.profile !== null);
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    configurePurchases();
    return addNotificationResponseListener((url) => router.push(url as never));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    maybeLoadDemoFromUrl();
    useStore.getState().recordAppOpen();
    SplashScreen.hideAsync().catch(() => {});
    resync();
    // Keep reminders in step with data changes that affect them.
    const unsubscribe = useStore.subscribe((state, prev) => {
      if (
        state.medications !== prev.medications ||
        state.doses !== prev.doses ||
        state.settings !== prev.settings ||
        state.pillTimer !== prev.pillTimer ||
        state.meta.trialEndsAt !== prev.meta.trialEndsAt
      ) {
        resync();
      }
    });
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        resync();
        refreshEntitlement();
      }
    });
    return () => {
      unsubscribe();
      sub.remove();
    };
  }, [hydrated]);

  if (!hydrated) return null;

  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const modal = { presentation: Platform.OS === 'ios' ? ('modal' as const) : ('card' as const) };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeProvider value={{ ...navTheme, colors: { ...navTheme.colors, background: colors.background, primary: colors.primary } }}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Protected guard={!onboarded} redirectTo="/">
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          </Stack.Protected>
          <Stack.Protected guard={onboarded} redirectTo="/onboarding">
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="log-dose" options={modal} />
            <Stack.Screen name="log-weight" options={modal} />
            <Stack.Screen name="log-symptoms" options={modal} />
            <Stack.Screen name="medication/[id]" options={modal} />
            <Stack.Screen name="share" options={modal} />
            <Stack.Screen name="report" options={modal} />
            <Stack.Screen name="targets" options={modal} />
            <Stack.Screen name="profile" options={modal} />
            <Stack.Screen name="level-info" options={modal} />
          </Stack.Protected>
          <Stack.Screen
            name="paywall"
            options={{ presentation: Platform.OS === 'ios' ? 'fullScreenModal' : 'card', animation: 'slide_from_bottom' }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
