import { DOOR_COUNT, TIME_ZONE } from './constants';

export interface BerlinDate {
  year: number;
  month: number;
  day: number;
}

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Kalenderdatum in Europe/Berlin (CET im Dezember) für einen Zeitpunkt. */
export function berlinDate(now: Date = new Date()): BerlinDate {
  const parts = formatter.formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** Türchen `day` ist ab 00:00 Uhr Berliner Zeit am `day`. Dezember des Kalenderjahres offen. */
export function isDoorUnlocked(calendarYear: number, day: number, now: Date = new Date()): boolean {
  const today = berlinDate(now);
  if (today.year !== calendarYear) return today.year > calendarYear;
  return today.month === 12 && today.day >= day;
}

/** Anzahl der bereits freigeschalteten Türchen (0–24). */
export function unlockedDoorCount(calendarYear: number, now: Date = new Date()): number {
  let count = 0;
  for (let day = 1; day <= DOOR_COUNT; day++) {
    if (isDoorUnlocked(calendarYear, day, now)) count++;
  }
  return count;
}

/** Ein neu angelegter Kalender gilt für diesen Dezember, nach Heiligabend für den nächsten. */
export function defaultCalendarYear(now: Date = new Date()): number {
  const today = berlinDate(now);
  return today.month === 12 && today.day > DOOR_COUNT ? today.year + 1 : today.year;
}
