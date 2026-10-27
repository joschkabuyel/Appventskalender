import { getTheme, type Door } from '@adventskalender/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DoorTile } from '@/components/DoorTile';
import { ThemedBackground } from '@/components/ThemedBackground';
import { Button, colors, Loading } from '@/components/ui';
import { mediaUrl } from '@/lib/api';
import { useCalendar } from '@/lib/useCalendar';

/** So sehen Empfänger den Kalender – in der Vorschau sind alle Türchen offen. */
export default function Vorschau() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useCalendar(id);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [openDoor, setOpenDoor] = useState<Door | null>(null);

  if (!data) return <Loading />;
  const { calendar, doors } = data;
  const theme = getTheme(calendar.theme_id);
  const doorSize = Math.floor((Math.min(width, 560) - 32 - 3 * 10) / 4);
  const doorImageUrl = mediaUrl(calendar.custom_door_path);
  const openImage = mediaUrl(openDoor?.image_path);

  return (
    <ThemedBackground
      theme={theme}
      seed={calendar.share_token}
      backgroundUrl={mediaUrl(calendar.custom_background_path)}
      style={{ flex: 1 }}
    >
      <Stack.Screen options={{ title: 'Vorschau' }} />
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 24 + insets.bottom }]}>
        <Text style={styles.banner}>Vorschau: Alle Türchen sind offen. Empfänger sehen nur freigeschaltete Türchen.</Text>
        <Text style={[styles.title, { color: theme.accent }]}>{calendar.title}</Text>
        <View style={styles.grid}>
          {doors.map((door) => (
            <Pressable key={door.day} onPress={() => setOpenDoor(door)} accessibilityLabel={`Türchen ${door.day} ansehen`}>
              <DoorTile day={door.day} theme={theme} doorImageUrl={doorImageUrl} size={doorSize} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal visible={openDoor !== null} animationType="slide" onRequestClose={() => setOpenDoor(null)}>
        <ThemedBackground theme={theme} seed={calendar.share_token} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={[styles.container, { paddingTop: 16 + insets.top }]}>
            <View style={styles.doorHeader}>
              <Button label="← Zurück" variant="secondary" onPress={() => setOpenDoor(null)} small />
              <Text style={[styles.doorNumber, { color: theme.accent }]}>{openDoor?.day}</Text>
            </View>
            <View style={styles.card}>
              {openImage && <Image source={{ uri: openImage }} style={styles.image} resizeMode="contain" />}
              {openDoor?.text?.trim() ? (
                <Text style={styles.quote}>{openDoor.text}</Text>
              ) : (
                !openImage && <Text style={styles.empty}>Dieses Türchen ist noch leer.</Text>
              )}
            </View>
          </ScrollView>
        </ThemedBackground>
      </Modal>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  banner: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    color: colors.text,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    overflow: 'hidden',
  },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginVertical: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  doorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  doorNumber: { fontSize: 48, fontWeight: '800' },
  card: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 16, marginTop: 16, gap: 12 },
  image: { width: '100%', height: 320, borderRadius: 8 },
  quote: { fontSize: 19, lineHeight: 28, color: colors.text, fontFamily: 'serif' },
  empty: { color: colors.muted, fontStyle: 'italic' },
});
