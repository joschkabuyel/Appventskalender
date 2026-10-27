export interface Theme {
  id: string;
  name: string;
  description: string;
  /** Verlauf des Hintergrunds von oben nach unten. */
  background: [string, string];
  /** Deko-Symbole, die verstreut über den Hintergrund gelegt werden. */
  decorations: string[];
  door: {
    background: string;
    border: string;
    text: string;
    /** Farbe geöffneter Türchen. */
    openedBackground: string;
  };
  /** Farbe für Überschriften und Buttons. */
  accent: string;
  /** Textfarbe auf dem Hintergrund. */
  text: string;
}

export const THEMES: Theme[] = [
  {
    id: 'klassisch',
    name: 'Klassisch',
    description: 'Tannengrün, Weihnachtsrot und Gold',
    background: ['#1f4d2b', '#0f2a17'],
    decorations: ['🎄', '⭐', '🎁', '🔔'],
    door: { background: '#b3261e', border: '#e8c15a', text: '#fff8e7', openedBackground: '#6b1712' },
    accent: '#e8c15a',
    text: '#fff8e7',
  },
  {
    id: 'winterwunderland',
    name: 'Winterwunderland',
    description: 'Eisblau, Schneeflocken und Schneemänner',
    background: ['#dff1ff', '#9cc9ec'],
    decorations: ['❄️', '⛄', '❄️', '🌨️'],
    door: { background: '#ffffff', border: '#5b9bd5', text: '#1d4e7a', openedBackground: '#c6dff3' },
    accent: '#1d4e7a',
    text: '#12324f',
  },
  {
    id: 'lebkuchen',
    name: 'Lebkuchen',
    description: 'Warme Brauntöne, Plätzchen und Kerzenschein',
    background: ['#8a5a32', '#4e2f17'],
    decorations: ['🍪', '🕯️', '✨', '🥨'],
    door: { background: '#f3e2c4', border: '#ffffff', text: '#5a341a', openedBackground: '#c9a77c' },
    accent: '#f3e2c4',
    text: '#fff4e2',
  },
  {
    id: 'heilige-nacht',
    name: 'Heilige Nacht',
    description: 'Nachtblau mit goldenen Sternen',
    background: ['#1b2550', '#070b1f'],
    decorations: ['⭐', '🌙', '✨', '🌟'],
    door: { background: '#24316a', border: '#f2c94c', text: '#f2c94c', openedBackground: '#3a4688' },
    accent: '#f2c94c',
    text: '#f5f1e3',
  },
  {
    id: 'nordisch',
    name: 'Nordisch',
    description: 'Skandinavisch schlicht: Weiß, Rot und Rentiere',
    background: ['#fbf7f2', '#efe5d8'],
    decorations: ['🦌', '🌲', '❤️', '🧦'],
    door: { background: '#ffffff', border: '#c0392b', text: '#c0392b', openedBackground: '#f4d6d2' },
    accent: '#c0392b',
    text: '#3b2a24',
  },
];

export const DEFAULT_THEME_ID = THEMES[0].id;

export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

/**
 * Feste, über den Token pseudozufällige Positionen für Deko-Symbole,
 * damit jeder Empfänger desselben Links denselben Hintergrund sieht.
 */
export function decorationLayout(seed: string, count = 18): { x: number; y: number; size: number; index: number }[] {
  let state = 0;
  for (const char of seed) state = (state * 31 + char.charCodeAt(0)) >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  return Array.from({ length: count }, (_, index) => ({
    x: Math.round(next() * 92),
    y: Math.round(next() * 94),
    size: 18 + Math.round(next() * 22),
    index,
  }));
}

/** Vorgaben für eigene Designs, die Ersteller hochladen können. */
export const CUSTOM_DESIGN_SPECS = {
  background: {
    label: 'Hintergrundbild',
    formats: ['image/jpeg', 'image/png', 'image/webp'],
    formatLabel: 'JPG, PNG oder WebP',
    aspectRatio: 9 / 16,
    recommended: { width: 1080, height: 1920 },
    minimum: { width: 720, height: 1280 },
    hints: [
      'Hochformat 9:16, empfohlen 1080 × 1920 Pixel (mindestens 720 × 1280).',
      'Höchstens 5 MB, als JPG, PNG oder WebP.',
      'Die Türchen liegen über dem Bild. Ruhige Motive mit wenig Kontrast wirken am besten.',
      'Wichtige Motive in die Mitte setzen. Je nach Display kann der Rand etwas abgeschnitten werden.',
    ],
  },
  door: {
    label: 'Türchen-Motiv',
    formats: ['image/png', 'image/jpeg', 'image/webp'],
    formatLabel: 'PNG (Transparenz erlaubt), JPG oder WebP',
    aspectRatio: 1,
    recommended: { width: 512, height: 512 },
    minimum: { width: 256, height: 256 },
    hints: [
      'Quadratisch 1:1, empfohlen 512 × 512 Pixel (mindestens 256 × 256).',
      'Höchstens 5 MB. PNG mit transparentem Hintergrund ist ideal.',
      'Die Türchen-Nummer wird mittig darübergelegt. Die Mitte möglichst hell und ruhig halten.',
    ],
  },
} as const;

export type CustomDesignKind = keyof typeof CUSTOM_DESIGN_SPECS;

/** Prüft ein ausgewähltes Bild gegen die Vorgaben. Liefert Fehler (blockierend) und Hinweise. */
export function validateCustomDesign(
  kind: CustomDesignKind,
  image: { width: number; height: number; bytes?: number | null; mimeType?: string | null },
): { errors: string[]; warnings: string[] } {
  const spec = CUSTOM_DESIGN_SPECS[kind];
  const errors: string[] = [];
  const warnings: string[] = [];
  if (image.bytes != null && image.bytes > 5 * 1024 * 1024) {
    errors.push('Das Bild ist größer als 5 MB.');
  }
  if (image.mimeType && !(spec.formats as readonly string[]).includes(image.mimeType)) {
    errors.push(`Format nicht unterstützt. Erlaubt: ${spec.formatLabel}.`);
  }
  if (image.width > 0 && image.height > 0) {
    if (image.width < spec.minimum.width || image.height < spec.minimum.height) {
      errors.push(
        `Das Bild ist zu klein (${image.width} × ${image.height}). Mindestens ${spec.minimum.width} × ${spec.minimum.height} Pixel.`,
      );
    }
    const ratio = image.width / image.height;
    if (Math.abs(ratio - spec.aspectRatio) / spec.aspectRatio > 0.1) {
      warnings.push(
        kind === 'background'
          ? 'Das Bild ist nicht im Format 9:16 und wird an den Rändern beschnitten.'
          : 'Das Bild ist nicht quadratisch und wird beschnitten.',
      );
    }
  }
  return { errors, warnings };
}
