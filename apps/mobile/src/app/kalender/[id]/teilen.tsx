import { buildShareUrl } from '@adventskalender/shared';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, colors, Loading } from '@/components/ui';
import { config } from '@/lib/config';
import { useCalendar } from '@/lib/useCalendar';

/** Wireframe „Teilen“: Link zum Kalender + „Meine Kalender“. */
export default function Teilen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useCalendar(id);
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  if (!data) return <Loading />;
  const { calendar } = data;
  const url = buildShareUrl(config.webUrl, calendar.share_token);

  async function share() {
    await Share.share({
      title: calendar.title,
      message: `🎄 Ich habe einen Adventskalender für dich gestaltet: „${calendar.title}“. Ab dem 1. Dezember öffnet sich jeden Tag ein Türchen:\n${url}`,
    });
  }

  async function copy() {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={[styles.container, { paddingBottom: 16 + insets.bottom }]}>
      <View>
        <Text style={styles.title}>{calendar.title}</Text>
        <Text style={styles.text}>
          Schicke diesen Link an deine Freunde. Alle mit dem Link sehen denselben Kalender. Änderungen an noch gesperrten
          Türchen werden automatisch übernommen.
        </Text>
        <View style={styles.linkBox}>
          <Text style={styles.link} selectable numberOfLines={2}>
            {url}
          </Text>
          <Pressable onPress={() => Linking.openURL(url)} accessibilityLabel="Link im Browser öffnen" hitSlop={8}>
            <MaterialIcons name="open-in-new" size={26} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.row}>
          <Button label="Link teilen" onPress={share} style={styles.flex} />
          <Button label={copied ? 'Kopiert ✓' : 'Kopieren'} variant="secondary" onPress={copy} style={styles.flex} />
        </View>
      </View>
      <Button label="Meine Kalender" onPress={() => router.dismissTo('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 8 },
  text: { fontSize: 15, color: colors.muted, lineHeight: 21, marginVertical: 12 },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginVertical: 12,
  },
  link: { flex: 1, minWidth: 0, fontSize: 15, color: colors.primary },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
