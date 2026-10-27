import type { Calendar } from '@adventskalender/shared';
import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Button, colors, Loading, Screen } from '@/components/ui';
import { deleteCalendar, listCalendars } from '@/lib/api';
import { useSession } from '@/lib/session';

/** Wireframe „Meine Kalender“: Liste mit Teilen (↗) und Löschen (✕) plus „+“. */
export default function MeineKalender() {
  const { state } = useSession();
  const insets = useSafeAreaInsets();
  const [calendars, setCalendars] = useState<Calendar[] | null>(null);
  const [toDelete, setToDelete] = useState<Calendar | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    listCalendars()
      .then(setCalendars)
      .catch((e: Error) => Alert.alert('Fehler', e.message));
  }, []);

  useFocusEffect(load);

  if (state.status === 'ready' && !state.profile) return <Redirect href="/willkommen" />;

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCalendar(toDelete);
      setCalendars((current) => current?.filter((c) => c.id !== toDelete.id) ?? null);
      setToDelete(null);
    } catch (e) {
      Alert.alert('Löschen fehlgeschlagen', (e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/willkommen')} accessibilityLabel="Profil bearbeiten" hitSlop={12}>
              <MaterialIcons name="account-circle" size={28} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      {calendars === null ? (
        <Loading />
      ) : (
        <FlatList
          data={calendars}
          keyExtractor={(item) => item.id}
          contentContainerStyle={calendars.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎁</Text>
              <Text style={styles.emptyText}>Du hast noch keinen Kalender. Leg gleich los!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                style={styles.rowMain}
                onPress={() => router.push(`/kalender/${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title} bearbeiten`}
              >
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowSub}>Advent {item.year}</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/kalender/${item.id}/teilen`)}
                accessibilityLabel={`${item.title} teilen`}
                hitSlop={8}
                style={styles.icon}
              >
                <MaterialIcons name="open-in-new" size={26} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => setToDelete(item)}
                accessibilityLabel={`${item.title} löschen`}
                hitSlop={8}
                style={styles.icon}
              >
                <MaterialIcons name="close" size={28} color={colors.text} />
              </Pressable>
            </View>
          )}
        />
      )}
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button label="+  Neuer Kalender" onPress={() => router.push('/neu')} />
      </View>
      <ConfirmModal
        visible={toDelete !== null}
        title="Kalender löschen"
        message={`Möchten Sie den Kalender „${toDelete?.title ?? ''}“ löschen? Der geteilte Link funktioniert danach nicht mehr.`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        loading={deleting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 24 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 16,
  },
  rowMain: { flex: 1, paddingVertical: 14 },
  rowTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  icon: { padding: 12 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
});
