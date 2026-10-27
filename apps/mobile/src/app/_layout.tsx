import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { Button, Centered, colors, Loading } from '@/components/ui';
import { SessionProvider, useSession } from '@/lib/session';

function Gate() {
  const { state, retry } = useSession();
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') {
    return (
      <Centered>
        <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 16, color: colors.text }}>{state.message}</Text>
        <Button label="Erneut versuchen" onPress={retry} />
      </Centered>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Meine Kalender' }} />
      <Stack.Screen name="willkommen" options={{ title: 'Willkommen' }} />
      <Stack.Screen name="neu" options={{ title: 'Neuer Kalender' }} />
      <Stack.Screen name="kalender/[id]/index" options={{ title: 'Türchen' }} />
      <Stack.Screen name="kalender/[id]/tuer/[day]" options={{ title: 'Türchen bearbeiten' }} />
      <Stack.Screen name="kalender/[id]/design" options={{ title: 'Design' }} />
      <Stack.Screen name="kalender/[id]/vorschau" options={{ title: 'Vorschau' }} />
      <Stack.Screen name="kalender/[id]/teilen" options={{ title: 'Teilen' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Gate />
    </SessionProvider>
  );
}
