import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { Button, colors } from '@/components/ui';
import { saveProfile } from '@/lib/api';
import { useSession } from '@/lib/session';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Einstieg ohne Passwort: Name und E-Mail genügen. Auch zum späteren Ändern des Profils. */
export default function Willkommen() {
  const { state, setProfile } = useSession();
  const existing = state.status === 'ready' ? state.profile : null;
  const [name, setName] = useState(existing?.name ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (state.status !== 'ready') return;
    if (!name.trim()) return setError('Bitte gib deinen Namen ein.');
    if (!EMAIL_PATTERN.test(email.trim())) return setError('Bitte gib eine gültige E-Mail-Adresse ein.');
    setSaving(true);
    setError(null);
    try {
      setProfile(await saveProfile(state.userId, name, email));
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>🎄</Text>
        <Text style={styles.title}>{existing ? 'Dein Profil' : 'Schön, dass du da bist!'}</Text>
        <Text style={styles.text}>
          Erstelle persönliche Adventskalender für deine Liebsten. Dein Name wird den Empfängern angezeigt.
        </Text>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="z. B. Anna"
          autoComplete="name"
          maxLength={80}
          returnKeyType="next"
        />
        <Text style={styles.label}>E-Mail</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="anna@example.de"
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
          maxLength={254}
          onSubmitEditing={submit}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Button label={existing ? 'Speichern' : 'Loslegen'} onPress={submit} loading={saving} style={{ marginTop: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  emoji: { fontSize: 56, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', color: colors.text, marginTop: 8 },
  text: { fontSize: 15, textAlign: 'center', color: colors.muted, marginVertical: 16, lineHeight: 21 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: colors.red, marginTop: 12 },
});
