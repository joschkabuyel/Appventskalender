import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button, colors } from './ui';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

/** Ja/Nein-Dialog wie im Wireframe „Möchten Sie diesen Kalender löschen?“. */
export function ConfirmModal({ visible, title, message, onConfirm, onCancel, loading }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button label="Ja" onPress={onConfirm} loading={loading} style={styles.action} />
            <Button label="Nein" variant="secondary" onPress={onCancel} disabled={loading} style={styles.action} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: colors.card, borderRadius: 12, padding: 20 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  message: { fontSize: 15, color: colors.text, textAlign: 'center', marginVertical: 16, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 12 },
  action: { flex: 1 },
});
