import { applyOrder, moveOrder, shuffleOrder, type DoorOrder } from '@adventskalender/shared';
import { MaterialIcons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DoorList } from '@/components/DoorList';
import { Button, Centered, colors, Loading, Screen } from '@/components/ui';
import { reorderDoors } from '@/lib/api';
import { pickAndUploadDoorImage } from '@/lib/doorImage';
import { useUserId } from '@/lib/session';
import { movableDays, useCalendar } from '@/lib/useCalendar';

/** Wireframe „With Pic / No Pic“: 24 Türchen mit Zitat und/oder Bild, Mischen und Drag & Drop. */
export default function KalenderTuerchen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const insets = useSafeAreaInsets();
  const { data, setData, error, reload } = useCalendar(id);
  const [busyDay, setBusyDay] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reordering, setReordering] = useState(false);

  if (error && !data) {
    return (
      <Centered>
        <Text style={{ marginBottom: 16, textAlign: 'center' }}>{error}</Text>
        <Button label="Erneut versuchen" onPress={reload} />
      </Centered>
    );
  }
  if (!data) return <Loading />;

  const { calendar, doors } = data;
  const movable = movableDays(calendar, doors);
  const filled = doors.filter((d) => d.text?.trim() || d.image_path).length;

  async function applyReorder(order: DoorOrder) {
    if (!data) return;
    const previous = data;
    setData({ ...data, doors: applyOrder(data.doors, order) }); // optimistisch
    setReordering(true);
    try {
      await reorderDoors(calendar.id, order);
    } catch (e) {
      setData(previous);
      Alert.alert('Verschieben fehlgeschlagen', (e as Error).message);
    } finally {
      setReordering(false);
      reload();
    }
  }

  function confirmShuffle() {
    if (movable.length < 2) return;
    Alert.alert(
      'Zufällig verteilen?',
      'Die Inhalte aller noch gesperrten Türchen werden zufällig neu verteilt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Mischen', onPress: () => applyReorder(shuffleOrder(movable)) },
      ],
    );
  }

  async function pickImageFor(day: number) {
    const door = doors.find((d) => d.day === day);
    if (!door) return;
    setBusyDay(day);
    try {
      const updated = await pickAndUploadDoorImage(userId, door);
      if (updated) {
        setData((current) =>
          current ? { ...current, doors: current.doors.map((d) => (d.day === day ? updated : d)) } : current,
        );
      }
    } catch (e) {
      Alert.alert('Bild konnte nicht gespeichert werden', (e as Error).message);
    } finally {
      setBusyDay(null);
    }
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: calendar.title,
          headerRight: () => (
            <Pressable
              onPress={confirmShuffle}
              disabled={reordering || movable.length < 2}
              accessibilityLabel="Inhalte zufällig verteilen"
              hitSlop={12}
            >
              <MaterialIcons name="shuffle" size={26} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView scrollEnabled={!dragging} contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={styles.info}>
          <Text style={styles.infoText}>
            {filled} von 24 Türchen gefüllt · Advent {calendar.year}
          </Text>
          <Text style={styles.hint}>
            Tippe auf einen Eintrag für Text oder Zitat. Mit ::: ziehst du einen Inhalt auf ein anderes Datum, 🔀 verteilt
            alles zufällig. Text und Bild lassen sich einzeln oder zusammen nutzen.
          </Text>
          {movable.length < 24 && (
            <Text style={styles.hint}>Geöffnete Türchen (🔓) sind fest und können nicht mehr geändert werden.</Text>
          )}
        </View>
        <DoorList
          doors={doors}
          movableDays={movable}
          busyDay={busyDay}
          onOpen={(day) => router.push(`/kalender/${calendar.id}/tuer/${day}`)}
          onPickImage={pickImageFor}
          onMove={(from, to) => applyReorder(moveOrder(movable, from, to))}
          onDragStateChange={setDragging}
        />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <View style={styles.footerRow}>
          <Button
            label="Design"
            variant="secondary"
            onPress={() => router.push(`/kalender/${calendar.id}/design`)}
            style={styles.flex}
          />
          <Button
            label="Vorschau"
            variant="secondary"
            onPress={() => router.push(`/kalender/${calendar.id}/vorschau`)}
            style={styles.flex}
          />
        </View>
        <Button label="Weiter zum Teilen" onPress={() => router.push(`/kalender/${calendar.id}/teilen`)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: { padding: 16, gap: 6 },
  infoText: { fontSize: 15, fontWeight: '600', color: colors.text },
  hint: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  footer: { padding: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.card },
  footerRow: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
