import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing, TabBarInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';

import { Icon, type IconName } from './icon';
import { Text } from './text';

/** Scrollable tab screen with a large title. */
export function Screen({
  title,
  subtitle,
  right,
  children,
  contentStyle,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[
          styles.screenContent,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + TabBarInset },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {(title || right) && (
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                {subtitle ? (
                  <Text variant="subhead" color="textSecondary">
                    {subtitle}
                  </Text>
                ) : null}
                {title ? (
                  <Text variant="title" accessibilityRole="header">
                    {title}
                  </Text>
                ) : null}
              </View>
              {right}
            </View>
          )}
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  tone = 'surface',
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: 'surface' | 'primary' | 'plain';
}) {
  const theme = useTheme();
  const bg = tone === 'primary' ? theme.primary : tone === 'plain' ? 'transparent' : theme.surface;
  const fg = tone === 'primary' ? theme.onPrimary : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: bg, opacity: pressed ? 0.7 : 1 }]}>
      <Icon name={icon} size={17} tint={fg} weight="semibold" />
    </Pressable>
  );
}

/** Full-height modal screen with a title bar, scroll body and an optional pinned footer. */
export function ModalScreen({
  title,
  children,
  footer,
  onClose,
  scroll = true,
  headerRight,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  scroll?: boolean;
  headerRight?: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const close = onClose ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  const body = <View style={[styles.inner, styles.modalBody]}>{children}</View>;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? Spacing.lg : insets.top + Spacing.md }]}>
        <View style={styles.modalHeaderSide}>
          <IconButton icon="close" label="Close" onPress={close} />
        </View>
        <Text variant="headline" align="center" style={styles.flex} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.modalHeaderSide, styles.alignEnd]}>{headerRight}</View>
      </View>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {body}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{body}</View>
      )}
      {footer ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, Spacing.lg), borderTopColor: theme.border, backgroundColor: theme.background },
          ]}>
          <View style={styles.inner}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="title2" style={styles.flex}>
        {title}
      </Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text variant="subhead" color="primary" weight="600">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ListSection({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.listSection}>
      {title ? (
        <Text variant="overline" color="textSecondary" style={styles.listTitle}>
          {title}
        </Text>
      ) : null}
      <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.border }]}>{children}</View>
      {footer ? (
        <Text variant="footnote" color="textTertiary" style={styles.listTitle}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export function ListRow({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onPress,
  right,
  destructive,
  last,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  last?: boolean;
}) {
  const theme = useTheme();
  const content = (
    <View style={[styles.row, !last && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      {icon && (
        <View style={[styles.rowIcon, { backgroundColor: (iconColor ?? theme.primary) + '1F' }]}>
          <Icon name={icon} size={16} tint={iconColor ?? theme.primary} />
        </View>
      )}
      <View style={styles.flex}>
        <Text variant="callout" weight="500" color={destructive ? 'danger' : 'text'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="callout" color="textSecondary">
          {value}
        </Text>
      ) : null}
      {right}
      {onPress && !right ? <Icon name="chevronRight" size={13} color="textTertiary" weight="semibold" /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => pressed && { backgroundColor: theme.surfaceAlt }}>
      {content}
    </Pressable>
  );
}

export function Badge({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }) {
  const theme = useTheme();
  const map = {
    primary: [theme.primarySoft, theme.primary],
    success: [theme.successSoft, theme.success],
    warning: [theme.warningSoft, theme.warning],
    danger: [theme.dangerSoft, theme.danger],
    neutral: [theme.surfaceAlt, theme.textSecondary],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text variant="caption" weight="700" tint={fg}>
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
        <Icon name={icon} size={26} color="primary" />
      </View>
      <Text variant="headline" align="center">
        {title}
      </Text>
      <Text variant="footnote" color="textSecondary" align="center">
        {body}
      </Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  alignEnd: { alignItems: 'flex-end' },
  screenContent: { paddingHorizontal: Spacing.lg },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md, marginBottom: Spacing.xs },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  modalHeaderSide: { width: 72 },
  modalScroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  modalBody: { paddingTop: Spacing.xs },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm },
  listSection: { gap: Spacing.sm },
  listTitle: { paddingHorizontal: Spacing.lg },
  list: { borderRadius: Radius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 13, paddingHorizontal: Spacing.lg, minHeight: 52 },
  rowIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  empty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
});
