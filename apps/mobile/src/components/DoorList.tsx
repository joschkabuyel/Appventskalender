import { doorHasContent, type Door } from '@adventskalender/shared';
import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, colors } from './ui';

export const ROW_HEIGHT = 64;

interface Props {
  doors: Door[];
  /** Noch gesperrte Türchen – nur deren Inhalte dürfen geändert und verschoben werden. */
  movableDays: number[];
  busyDay: number | null;
  onOpen: (day: number) => void;
  onPickImage: (day: number) => void;
  onMove: (fromDay: number, toDay: number) => void;
  onDragStateChange: (dragging: boolean) => void;
}

interface DragState {
  fromIndex: number;
  targetIndex: number;
}

/**
 * Liste der 24 Türchen (Wireframe „With Pic / No Pic“). Über den Griff ::: lässt sich der Inhalt
 * per Drag & Drop auf ein anderes Datum verschieben.
 */
export function DoorList({ doors, movableDays, busyDay, onOpen, onPickImage, onMove, onDragStateChange }: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const firstMovableIndex = movableDays.length > 0 ? movableDays[0] - 1 : doors.length;

  // Aktuelle Werte für die einmal erzeugten PanResponder.
  const latest = useRef({ firstMovableIndex, onMove, onDragStateChange, count: doors.length });
  latest.current = { firstMovableIndex, onMove, onDragStateChange, count: doors.length };
  const dragRef = useRef<DragState | null>(null);

  const updateDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const responders = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderTerminationRequest: () => false,
          onPanResponderGrant: () => {
            translateY.setValue(0);
            updateDrag({ fromIndex: index, targetIndex: index });
            latest.current.onDragStateChange(true);
          },
          onPanResponderMove: (_, gesture) => {
            translateY.setValue(gesture.dy);
            const { firstMovableIndex: min, count } = latest.current;
            const target = Math.max(min, Math.min(count - 1, index + Math.round(gesture.dy / ROW_HEIGHT)));
            if (dragRef.current && dragRef.current.targetIndex !== target) {
              updateDrag({ fromIndex: index, targetIndex: target });
            }
          },
          onPanResponderRelease: () => {
            const current = dragRef.current;
            updateDrag(null);
            translateY.setValue(0);
            latest.current.onDragStateChange(false);
            if (current && current.targetIndex !== current.fromIndex) {
              latest.current.onMove(current.fromIndex + 1, current.targetIndex + 1);
            }
          },
          onPanResponderTerminate: () => {
            updateDrag(null);
            translateY.setValue(0);
            latest.current.onDragStateChange(false);
          },
        }),
      ),
    [translateY],
  );

  return (
    <View>
      {doors.map((door, index) => {
        const movable = movableDays.includes(door.day);
        const isDragged = drag?.fromIndex === index;
        const isTarget = drag !== null && drag.targetIndex === index && !isDragged;
        const hasImage = Boolean(door.image_path);
        return (
          <Animated.View
            key={door.day}
            style={[
              styles.row,
              isTarget && styles.target,
              isDragged && styles.dragged,
              isDragged && { transform: [{ translateY }] },
            ]}
          >
            {movable ? (
              <View
                {...responders[index].panHandlers}
                style={styles.handle}
                accessibilityLabel={`Türchen ${door.day} verschieben`}
                accessibilityHint="Gedrückt halten und nach oben oder unten ziehen"
              >
                <MaterialIcons name="drag-indicator" size={24} color={colors.muted} />
              </View>
            ) : (
              <View style={styles.handle} accessibilityLabel="Bereits geöffnet">
                <MaterialIcons name="lock-open" size={20} color={colors.muted} />
              </View>
            )}
            <Text style={styles.number}>{door.day}</Text>
            <Pressable
              style={styles.preview}
              onPress={() => onOpen(door.day)}
              accessibilityRole="button"
              accessibilityLabel={`Türchen ${door.day} bearbeiten`}
            >
              <Text style={[styles.previewText, !door.text && styles.placeholder]} numberOfLines={2}>
                {door.text?.trim() ? `„${door.text.trim()}“` : doorHasContent(door) ? 'Nur Bild' : 'Text eingeben …'}
              </Text>
            </Pressable>
            <MaterialIcons
              name={hasImage ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={hasImage ? colors.primary : colors.border}
              accessibilityLabel={hasImage ? 'Mit Bild' : 'Ohne Bild'}
            />
            <Button
              small
              label={hasImage ? 'Bild ändern' : 'Bild wählen'}
              variant={hasImage ? 'primary' : 'secondary'}
              onPress={() => onPickImage(door.day)}
              disabled={!movable}
              loading={busyDay === door.day}
              style={styles.imageButton}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  target: { backgroundColor: '#EFE7FB', borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed' },
  dragged: {
    zIndex: 10,
    elevation: 8,
    backgroundColor: colors.highlight,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  handle: { width: 32, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  number: { width: 26, fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'right' },
  preview: { flex: 1, height: ROW_HEIGHT, justifyContent: 'center' },
  previewText: { fontSize: 14, color: colors.text },
  placeholder: { color: colors.muted, fontStyle: 'italic' },
  imageButton: { width: 96 },
});
