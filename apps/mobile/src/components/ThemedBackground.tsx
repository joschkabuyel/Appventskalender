import { decorationLayout, type Theme } from '@adventskalender/shared';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  theme: Theme;
  seed: string;
  backgroundUrl?: string | null;
  decorationCount?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/** Gleiche Optik wie auf der Empfänger-Website: Verlauf + Deko oder eigenes Hintergrundbild. */
export function ThemedBackground({ theme, seed, backgroundUrl, decorationCount = 18, style, children }: Props) {
  return (
    <View style={[styles.container, style]}>
      {backgroundUrl ? (
        <Image source={{ uri: backgroundUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <>
          <LinearGradient colors={theme.background} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.decorations]} pointerEvents="none">
            {decorationLayout(seed, decorationCount).map((item) => (
              <Text
                key={item.index}
                style={{ position: 'absolute', left: `${item.x}%`, top: `${item.y}%`, fontSize: item.size * 0.8 }}
              >
                {theme.decorations[item.index % theme.decorations.length]}
              </Text>
            ))}
          </View>
        </>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  decorations: { opacity: 0.35 },
});
