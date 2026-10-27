import { isDoorUnlocked, MAX_TEXT_LENGTH, type Door } from '@adventskalender/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, colors, Loading } from '@/components/ui';
import { mediaUrl, removeImages, updateDoor } from '@/lib/api';
import { pickAndUploadDoorImage } from '@/lib/doorImage';
import { useUserId } from '@/lib/session';
import { useCalendar } from '@/lib/useCalendar';

/** Wireframe „Enter text or citation“: mehrzeiliger Text (max. 500 Zeichen) und optional ein Bild. */
export default function TuerBearbeiten() {
  const { id, day: dayParam } = useLocalSearchParams<{ id: string; day: string }>();
  const day = Number(dayParam);
  const userId = useUserId();
  const insets = useSafeAreaInsets();
  const { data, setData } = useCalendar(id);
  const door = data?.doors.find((d) => d.day === day);
  const [text, setText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);

  useEffect(() => {
    if (door && text === null) setText(door.text ?? '');
  }, [door, text]);

  if (!data || !door || text === null) return <Loading />;

  const locked = isDoorUnlocked(data.calendar.year, day);
  const imageUrl = mediaUrl(door.image_path);

  function replaceDoor(updated: Door) {
    setData((current) =>
      current ? { ...current, doors: current.doors.map((d) => (d.day === updated.day ? updated : d)) } : current,
    );
  }

  async function save() {
    setSaving(true);
    try {
      const trimmed = text?.trim() ? text : null;
      replaceDoor(await updateDoor(id, day, { text: trimmed }));
      router.back();
    } catch (e) {
      Alert.alert('Speichern fehlgeschlagen', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function chooseImage() {
    if (!door) return;
    setImageBusy(true);
    try {
      const updated = await pickAndUploadDoorImage(userId, door);
      if (updated) replaceDoor(updated);
    } catch (e) {
      Alert.alert('Bild konnte nicht gespeichert werden', (e as Error).message);
    } finally {
      setImageBusy(false);
    }
  }

  async function removeImage() {
    if (!door) return;
    setImageBusy(true);
    try {
      const previous = door.image_path;
      replaceDoor(await updateDoor(id, day, { image_path: null }));
      await removeImages([previous]).catch(() => undefined);
    } catch (e) {
      Alert.alert('Bild konnte nicht entfernt werden', (e as Error).message);
    } finally {
      setImageBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: `Türchen ${day}` }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {locked && (
          <Text style={styles.locked}>🔓 Dieses Türchen ist bereits geöffnet und kann nicht mehr geändert werden.</Text>
        )}
        <Text style={styles.label}>Text oder Zitat</Text>
        <TextInput
          style={styles.textArea}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={MAX_TEXT_LENGTH}
          editable={!locked}
          placeholder={'„Das schönste Geschenk ist die gemeinsame Zeit.“'}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>
          {text.length} / {MAX_TEXT_LENGTH} Zeichen
        </Text>

        <Text style={styles.label}>Bild</Text>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" accessibilityLabel="Bild des Türchens" />
        ) : (
          <Text style={styles.hint}>Kein Bild. Du kannst ein eigenes Foto hochladen (max. 5 MB).</Text>
        )}
        {!locked && (
          <View style={styles.row}>
            <Button
              label={imageUrl ? 'Bild ändern' : 'Bild wählen'}
              variant="secondary"
              onPress={chooseImage}
              loading={imageBusy}
              style={styles.flex}
            />
            {imageUrl && (
              <Button label="Entfernen" variant="secondary" onPress={removeImage} disabled={imageBusy} style={styles.flex} />
            )}
          </View>
        )}
      </ScrollView>
      {!locked && (
        <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
          <Button label="Speichern" onPress={save} loading={saving} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  locked: { backgroundColor: '#FFF4D6', padding: 12, borderRadius: 8, color: colors.text, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 6 },
  textArea: {
    minHeight: 180,
    backgroundColor: colors.highlight,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  counter: { alignSelf: 'flex-end', color: colors.muted, fontSize: 12, marginTop: 4 },
  hint: { color: colors.muted, marginBottom: 8 },
  image: { width: '100%', height: 260, borderRadius: 8, backgroundColor: colors.border, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  footer: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.card },
});
