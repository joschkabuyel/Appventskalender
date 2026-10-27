import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

export const colors = {
  primary: '#6D35D9',
  primaryText: '#ffffff',
  red: '#B3261E',
  text: '#2B2118',
  muted: '#7A6A5A',
  border: '#E3DAD0',
  background: '#FBF8F4',
  card: '#ffffff',
  highlight: '#C9DBF7',
};

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled, loading, style, small }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        small && styles.small,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        (pressed || inactive) && { opacity: inactive ? 0.5 : 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : colors.primaryText} />
      ) : (
        <Text style={[styles.label, small && styles.smallLabel, variant === 'secondary' && styles.secondaryLabel]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Centered({ children }: { children: ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

export function Loading() {
  return (
    <Centered>
      <ActivityIndicator size="large" color={colors.primary} />
    </Centered>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  small: { paddingVertical: 6, paddingHorizontal: 10, minHeight: 32 },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary },
  danger: { backgroundColor: colors.red },
  label: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  smallLabel: { fontSize: 13 },
  secondaryLabel: { color: colors.primary },
});
