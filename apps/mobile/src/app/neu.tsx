import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, colors } from '@/components/ui';
import { createCalendar } from '@/lib/api';

/** Wireframe „Erstelle neuen Kalender“: Name eingeben, „+“. */
export default function NeuerKalender() {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) return setError('Bitte gib deinem Kalender einen Namen.');
    setSaving(true);
    setError(null);
    try {
      const calendar = await createCalendar(title);
      router.replace(`/kalender/${calendar.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingBottom: 16 + insets.bottom }]}>
        <View>
          <Text style={styles.label}>Name des Kalenders</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="z. B. Für meine Familie"
            maxLength={80}
            autoFocus
            onSubmitEditing={submit}
          />
          <Text style={styles.hint}>Den Namen sehen auch die Empfänger.</Text>
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
        <Button label="+  Kalender anlegen" onPress={submit} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'space-between' },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 24 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: colors.text,
  },
  hint: { color: colors.muted, marginTop: 8 },
  error: { color: colors.red, marginTop: 12 },
});
