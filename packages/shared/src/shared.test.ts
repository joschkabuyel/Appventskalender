import { describe, expect, it } from 'vitest';
import {
  applyOrder,
  berlinDate,
  defaultCalendarYear,
  identityOrder,
  isDoorUnlocked,
  moveOrder,
  parseCalendarPath,
  shuffleOrder,
  unlockedDoorCount,
  validateCustomDesign,
  buildShareUrl,
  decorationLayout,
} from './index';

describe('Freischaltung (Europe/Berlin)', () => {
  it('wechselt um Mitternacht CET, nicht UTC', () => {
    // 30.11. 23:30 UTC = 01.12. 00:30 CET
    expect(berlinDate(new Date('2026-11-30T23:30:00Z'))).toEqual({ year: 2026, month: 12, day: 1 });
    expect(isDoorUnlocked(2026, 1, new Date('2026-11-30T23:30:00Z'))).toBe(true);
    // 30.11. 22:59 UTC = 30.11. 23:59 CET
    expect(isDoorUnlocked(2026, 1, new Date('2026-11-30T22:59:00Z'))).toBe(false);
  });

  it('sperrt zukünftige Türchen', () => {
    const now = new Date('2026-12-05T10:00:00Z');
    expect(isDoorUnlocked(2026, 5, now)).toBe(true);
    expect(isDoorUnlocked(2026, 6, now)).toBe(false);
    expect(unlockedDoorCount(2026, now)).toBe(5);
  });

  it('behandelt vergangene und zukünftige Jahre', () => {
    expect(unlockedDoorCount(2025, new Date('2026-03-01T10:00:00Z'))).toBe(24);
    expect(unlockedDoorCount(2027, new Date('2026-12-24T10:00:00Z'))).toBe(0);
  });

  it('wählt nach Heiligabend das nächste Jahr', () => {
    expect(defaultCalendarYear(new Date('2026-10-27T10:00:00Z'))).toBe(2026);
    expect(defaultCalendarYear(new Date('2026-12-24T10:00:00Z'))).toBe(2026);
    expect(defaultCalendarYear(new Date('2026-12-25T10:00:00Z'))).toBe(2027);
  });
});

describe('Reihenfolge', () => {
  const allDays = identityOrder();

  it('mischt eine Permutation der beweglichen Türchen', () => {
    const order = shuffleOrder(allDays);
    expect([...order].sort((a, b) => a - b)).toEqual(allDays);
  });

  it('lässt offene Türchen beim Mischen unverändert', () => {
    const movable = allDays.filter((day) => day > 5);
    for (let i = 0; i < 20; i++) {
      const order = shuffleOrder(movable);
      expect(order.slice(0, 5)).toEqual([1, 2, 3, 4, 5]);
      expect([...order.slice(5)].sort((a, b) => a - b)).toEqual(movable);
    }
  });

  it('verschiebt per Drag & Drop', () => {
    const order = moveOrder(allDays, 2, 4);
    expect(order.slice(0, 5)).toEqual([1, 3, 4, 2, 5]);
    const back = moveOrder(allDays, 4, 2);
    expect(back.slice(0, 5)).toEqual([1, 4, 2, 3, 5]);
  });

  it('verweigert das Verschieben offener Türchen', () => {
    expect(() => moveOrder([3, 4, 5], 1, 4)).toThrow();
  });

  it('wendet eine Reihenfolge auf Inhalte an', () => {
    const doors = allDays.map((day) => ({ day, text: `T${day}` }));
    const moved = applyOrder(doors, moveOrder(allDays, 1, 3));
    expect(moved.slice(0, 4).map((d) => d.text)).toEqual(['T2', 'T3', 'T1', 'T4']);
    expect(moved.map((d) => d.day)).toEqual(allDays);
  });
});

describe('Links', () => {
  it('baut und parst Kalender-Links', () => {
    expect(buildShareUrl('https://example.org/', 'abc_12')).toBe('https://example.org/k/abc_12');
    expect(parseCalendarPath('/k/abc_12')).toEqual({ token: 'abc_12', day: null });
    expect(parseCalendarPath('/k/abc_12/7')).toEqual({ token: 'abc_12', day: 7 });
    expect(parseCalendarPath('/k/abc_12/25')).toEqual({ token: 'abc_12', day: null });
    expect(parseCalendarPath('/x')).toBeNull();
  });
});

describe('Designs', () => {
  it('prüft eigene Hintergründe', () => {
    expect(validateCustomDesign('background', { width: 1080, height: 1920, bytes: 1_000_000, mimeType: 'image/jpeg' })).toEqual({
      errors: [],
      warnings: [],
    });
    const tooSmall = validateCustomDesign('background', { width: 500, height: 900 });
    expect(tooSmall.errors).toHaveLength(1);
    const landscape = validateCustomDesign('background', { width: 1920, height: 1080 });
    expect(landscape.warnings).toHaveLength(1);
    expect(validateCustomDesign('door', { width: 512, height: 512, bytes: 6 * 1024 * 1024 }).errors).toHaveLength(1);
    expect(validateCustomDesign('door', { width: 512, height: 512, mimeType: 'image/gif' }).errors).toHaveLength(1);
  });

  it('platziert Deko deterministisch pro Kalender', () => {
    expect(decorationLayout('abc')).toEqual(decorationLayout('abc'));
    expect(decorationLayout('abc')).not.toEqual(decorationLayout('xyz'));
  });
});
