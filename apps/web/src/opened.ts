// Welche Türchen dieser Browser schon geöffnet hat (pro Kalender-Link, nur lokal).
const key = (token: string) => `adventskalender:geoeffnet:${token}`;

export function loadOpened(token: string): Set<number> {
  try {
    const raw = localStorage.getItem(key(token));
    const days = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(days) ? days.filter((d): d is number => typeof d === 'number') : []);
  } catch {
    return new Set();
  }
}

export function markOpened(token: string, day: number): Set<number> {
  const opened = loadOpened(token);
  opened.add(day);
  try {
    localStorage.setItem(key(token), JSON.stringify([...opened].sort((a, b) => a - b)));
  } catch {
    // Privater Modus o. Ä.: Status gilt dann nur für diese Sitzung.
  }
  return opened;
}
