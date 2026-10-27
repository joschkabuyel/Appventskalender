import { DOOR_COUNT } from './constants';

/**
 * Eine Reihenfolge ist ein Array mit 24 Einträgen: `order[day - 1]` ist das Türchen,
 * dessen bisheriger Inhalt künftig hinter Türchen `day` liegt. Die Identität ändert nichts.
 */
export type DoorOrder = number[];

export function identityOrder(): DoorOrder {
  return Array.from({ length: DOOR_COUNT }, (_, i) => i + 1);
}

export function isIdentityOrder(order: DoorOrder): boolean {
  return order.every((source, i) => source === i + 1);
}

function orderFromMovableSequence(movableDays: number[], contents: number[]): DoorOrder {
  const order = identityOrder();
  movableDays.forEach((day, i) => {
    order[day - 1] = contents[i];
  });
  return order;
}

/** Verteilt die Inhalte der beweglichen (noch gesperrten) Türchen zufällig neu. */
export function shuffleOrder(movableDays: number[], random: () => number = Math.random): DoorOrder {
  const contents = [...movableDays];
  for (let i = contents.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [contents[i], contents[j]] = [contents[j], contents[i]];
  }
  return orderFromMovableSequence(movableDays, contents);
}

/**
 * Drag & Drop: Der Inhalt von `fromDay` wandert zu `toDay`, die Inhalte dazwischen rücken
 * um eine Position nach. Bereits geöffnete Türchen bleiben unverändert.
 */
export function moveOrder(movableDays: number[], fromDay: number, toDay: number): DoorOrder {
  const from = movableDays.indexOf(fromDay);
  const to = movableDays.indexOf(toDay);
  if (from === -1 || to === -1) throw new Error('Nur noch gesperrte Türchen können verschoben werden.');
  const contents = [...movableDays];
  const [moved] = contents.splice(from, 1);
  contents.splice(to, 0, moved);
  return orderFromMovableSequence(movableDays, contents);
}

/** Wendet eine Reihenfolge lokal auf eine Liste von Türchen an (für optimistische Updates). */
export function applyOrder<T extends { day: number }>(doors: T[], order: DoorOrder): T[] {
  const byDay = new Map(doors.map((door) => [door.day, door]));
  return doors.map((door) => {
    const source = byDay.get(order[door.day - 1]);
    return source ? { ...source, day: door.day } : door;
  });
}
