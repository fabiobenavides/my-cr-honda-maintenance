import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { TASK_FLAG_LABELS, type TaskFlag } from '../data/faco-honda';
import { colors, radius, spacing } from '../theme';

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({
  children,
  highlighted,
  style,
}: {
  children: ReactNode;
  highlighted?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted, style]}>{children}</View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonLabel}>{label}</Text>}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.secondary, pressed && styles.buttonPressed]}
    >
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'red' | 'green' }) {
  const toneStyle =
    tone === 'red' ? styles.badgeRed : tone === 'green' ? styles.badgeGreen : styles.badgeNeutral;
  const textStyle =
    tone === 'red' ? styles.badgeRedText : tone === 'green' ? styles.badgeGreenText : styles.badgeNeutralText;
  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={[styles.badgeText, textStyle]}>{label}</Text>
    </View>
  );
}

export function FlagBadges({ flags }: { flags?: TaskFlag[] }) {
  if (!flags?.length) return null;
  return (
    <View style={styles.flagRow}>
      {flags.map((flag) => (
        <Badge key={flag} label={TASK_FLAG_LABELS[flag]} tone="neutral" />
      ))}
    </View>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardHighlighted: {
    backgroundColor: colors.highlight,
    borderColor: colors.highlightBorder,
    borderWidth: 2,
  },
  button: {
    backgroundColor: colors.hondaRed,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  secondary: {
    borderRadius: radius.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.hondaRed,
    backgroundColor: colors.white,
  },
  secondaryLabel: {
    color: colors.hondaRed,
    fontWeight: '700',
    fontSize: 15,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeNeutral: {
    backgroundColor: '#EEEFF2',
  },
  badgeNeutralText: {
    color: colors.muted,
  },
  badgeRed: {
    backgroundColor: '#FDE7EB',
  },
  badgeRedText: {
    color: colors.hondaRed,
  },
  badgeGreen: {
    backgroundColor: '#E3F6EC',
  },
  badgeGreenText: {
    color: colors.success,
  },
  flagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 8,
  },
  error: {
    color: colors.hondaRed,
    marginTop: 6,
    fontSize: 13,
  },
});
