import {
  CUSTOM_DESIGN_SPECS,
  getTheme,
  THEMES,
  validateCustomDesign,
  type CustomDesignKind,
} from '@adventskalender/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DoorTile } from '@/components/DoorTile';
import { ThemedBackground } from '@/components/ThemedBackground';
import { Button, colors, Loading } from '@/components/ui';
import { mediaUrl, prepareImage, removeImages, updateCalendar, uploadImage } from '@/lib/api';
import { pickImage } from '@/lib/images';
import { useUserId } from '@/lib/session';
import { useCalendar } from '@/lib/useCalendar';

const COLUMN: Record<CustomDesignKind, 'custom_background_path' | 'custom_door_path'> = {
  background: 'custom_background_path',
  door: 'custom_door_path',
};

/** Epic 1.5: weihnachtliche Designs wählen oder eigene hochladen. */
export default function Design() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const { data, setData } = useCalendar(id);
  const [busy, setBusy] = useState<string | null>(null);

  if (!data) return <Loading />;
  const { calendar } = data;

  async function selectTheme(themeId: string) {
    setBusy(themeId);
    try {
      const updated = await updateCalendar(calendar.id, { theme_id: themeId });
      setData((current) => (current ? { ...current, calendar: updated } : current));
    } catch (e) {
      Alert.alert('Design konnte nicht gespeichert werden', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function uploadCustom(kind: CustomDesignKind) {
    const spec = CUSTOM_DESIGN_SPECS[kind];
    const picked = await pickImage(kind === 'background' ? [9, 16] : [1, 1]);
    if (!picked) return;
    const { errors, warnings } = validateCustomDesign(kind, {
      width: picked.width,
      height: picked.height,
      bytes: picked.fileSize,
      mimeType: picked.mimeType,
    });
    if (errors.length > 0) {
      Alert.alert(`${spec.label} passt nicht`, [...errors, '', ...spec.hints].join('\n'));
      return;
    }
    const proceed = async () => {
      setBusy(kind);
      try {
        const prepared = await prepareImage(picked, {
          maxSide: kind === 'background' ? spec.recommended.height : spec.recommended.width,
          format: kind === 'door' ? 'png' : 'jpeg',
          quality: 0.85,
        });
        const path = await uploadImage(userId, calendar.id, prepared);
        const previous = calendar[COLUMN[kind]];
        const updated = await updateCalendar(calendar.id, { [COLUMN[kind]]: path });
        setData((current) => (current ? { ...current, calendar: updated } : current));
        await removeImages([previous]).catch(() => undefined);
      } catch (e) {
        Alert.alert('Upload fehlgeschlagen', (e as Error).message);
      } finally {
        setBusy(null);
      }
    };
    if (warnings.length > 0) {
      Alert.alert('Hinweis', warnings.join('\n'), [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Trotzdem verwenden', onPress: proceed },
      ]);
    } else {
      await proceed();
    }
  }

  async function removeCustom(kind: CustomDesignKind) {
    setBusy(kind);
    try {
      const previous = calendar[COLUMN[kind]];
      const updated = await updateCalendar(calendar.id, { [COLUMN[kind]]: null });
      setData((current) => (current ? { ...current, calendar: updated } : current));
      await removeImages([previous]).catch(() => undefined);
    } catch (e) {
      Alert.alert('Entfernen fehlgeschlagen', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Design wählen' }} />
      <Text style={styles.section}>Vorlagen</Text>
      <View style={styles.grid}>
        {THEMES.map((theme) => {
          const selected = theme.id === calendar.theme_id;
          return (
            <Pressable
              key={theme.id}
              onPress={() => selectTheme(theme.id)}
              disabled={busy !== null}
              style={[styles.themeCard, selected && styles.selected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${theme.name}: ${theme.description}`}
            >
              <ThemedBackground theme={theme} seed={theme.id} decorationCount={8} style={styles.themePreview}>
                <View style={styles.previewDoors}>
                  {[1, 2, 3, 4].map((day) => (
                    <DoorTile key={day} day={day} theme={theme} size={30} />
                  ))}
                </View>
              </ThemedBackground>
              <Text style={styles.themeName}>
                {selected ? '✓ ' : ''}
                {theme.name}
              </Text>
              <Text style={styles.themeDescription}>{theme.description}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>Eigenes Design</Text>
      <Text style={styles.intro}>
        Lade eigene Bilder hoch, um die Vorlage „{getTheme(calendar.theme_id).name}“ zu ergänzen. Die Farben der Vorlage
        bleiben für Schrift und Rahmen erhalten.
      </Text>
      {(Object.keys(CUSTOM_DESIGN_SPECS) as CustomDesignKind[]).map((kind) => {
        const spec = CUSTOM_DESIGN_SPECS[kind];
        const url = mediaUrl(calendar[COLUMN[kind]]);
        return (
          <View key={kind} style={styles.customCard}>
            <Text style={styles.customTitle}>{spec.label}</Text>
            {spec.hints.map((hint) => (
              <Text key={hint} style={styles.hint}>
                • {hint}
              </Text>
            ))}
            {url && (
              <Image
                source={{ uri: url }}
                style={kind === 'background' ? styles.customBackground : styles.customDoor}
                resizeMode="cover"
                accessibilityLabel={`Aktuelles ${spec.label}`}
              />
            )}
            <View style={styles.row}>
              <Button
                label={url ? 'Ersetzen' : 'Hochladen'}
                variant="secondary"
                onPress={() => uploadCustom(kind)}
                loading={busy === kind}
                disabled={busy !== null && busy !== kind}
                style={styles.flex}
              />
              {url && (
                <Button
                  label="Entfernen"
                  variant="secondary"
                  onPress={() => removeCustom(kind)}
                  disabled={busy !== null}
                  style={styles.flex}
                />
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  themeCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 8,
  },
  selected: { borderColor: colors.primary },
  themePreview: { height: 110, borderRadius: 8, justifyContent: 'center' },
  previewDoors: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  themeName: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 8 },
  themeDescription: { fontSize: 12, color: colors.muted, marginTop: 2 },
  intro: { color: colors.muted, marginBottom: 12, lineHeight: 20 },
  customCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  customTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  hint: { fontSize: 13, color: colors.text, lineHeight: 18 },
  customBackground: { width: 108, height: 192, borderRadius: 8, alignSelf: 'center', marginVertical: 8 },
  customDoor: { width: 96, height: 96, borderRadius: 8, alignSelf: 'center', marginVertical: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  flex: { flex: 1 },
});
