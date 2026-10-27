import type { Theme } from '@adventskalender/shared';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  day: number;
  theme: Theme;
  doorImageUrl?: string | null;
  size: number;
  style?: StyleProp<ViewStyle>;
}

/** Ein Türchen in der Optik des gewählten Designs (für Vorschau und Design-Auswahl). */
export function DoorTile({ day, theme, doorImageUrl, size, style }: Props) {
  return (
    <View
      style={[
        styles.door,
        { width: size, height: size, backgroundColor: theme.door.background, borderColor: theme.door.border },
        style,
      ]}
    >
      {doorImageUrl && <Image source={{ uri: doorImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
      <Text style={[styles.number, { color: theme.door.text, fontSize: size * 0.38 }]}>{day}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  door: {
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  number: { fontWeight: '800' },
});
