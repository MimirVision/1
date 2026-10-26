import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './ui/icon';
import { Text } from './ui/text';

/** Web build: a phone-style bottom tab bar (the native build uses system tabs). */
export default function AppTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList style={[styles.bar, { backgroundColor: theme.tabBar, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton icon="home" label="Today" />
        </TabTrigger>
        <TabTrigger name="meds" href="/meds" asChild>
          <TabButton icon="syringe" label="Meds" />
        </TabTrigger>
        <TabTrigger name="progress" href="/progress" asChild>
          <TabButton icon="chart" label="Progress" />
        </TabTrigger>
        <TabTrigger name="settings" href="/settings" asChild>
          <TabButton icon="person" label="You" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

function TabButton({ icon, label, isFocused, ref: _ref, ...props }: TabTriggerSlotProps & { icon: IconName; label: string }) {
  const theme = useTheme();
  const color = isFocused ? theme.primary : theme.textTertiary;
  return (
    <Pressable {...props} style={styles.button}>
      <View style={[styles.iconWrap, isFocused && { backgroundColor: theme.primarySoft }]}>
        <Icon name={icon} size={22} tint={color} />
      </View>
      <Text variant="caption" tint={color} weight={isFocused ? '700' : '500'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  button: { flex: 1, alignItems: 'center', gap: 2 },
  iconWrap: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
