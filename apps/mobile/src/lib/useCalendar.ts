import { isDoorUnlocked, type Calendar, type Door } from '@adventskalender/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getCalendar, listDoors } from './api';

export interface CalendarData {
  calendar: Calendar;
  doors: Door[];
}

/** Lädt Kalender + Türchen bei jedem Fokus des Screens neu. */
export function useCalendar(id: string) {
  const [data, setData] = useState<CalendarData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [calendar, doors] = await Promise.all([getCalendar(id), listDoors(id)]);
      setData({ calendar, doors });
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { data, setData, error, reload };
}

/** Türchen, deren Inhalt noch geändert werden darf (noch nicht freigeschaltet). */
export function movableDays(calendar: Calendar, doors: Door[], now = new Date()): number[] {
  return doors.filter((door) => !isDoorUnlocked(calendar.year, door.day, now)).map((door) => door.day);
}
