import { decorationLayout, type Theme } from '@adventskalender/shared';
import type { CSSProperties, ReactNode } from 'react';

interface Props {
  theme: Theme;
  seed: string;
  backgroundUrl: string | null;
  doorImageUrl: string | null;
  children: ReactNode;
}

/** Weihnachtlicher Hintergrund: eigenes Bild oder Theme-Verlauf mit verstreuter Deko. */
export function ThemeBackground({ theme, seed, backgroundUrl, doorImageUrl, children }: Props) {
  const style = {
    '--bg-top': theme.background[0],
    '--bg-bottom': theme.background[1],
    '--door-bg': theme.door.background,
    '--door-border': theme.door.border,
    '--door-text': theme.door.text,
    '--door-opened': theme.door.openedBackground,
    '--accent': theme.accent,
    '--text': theme.text,
    '--door-image': doorImageUrl ? `url("${doorImageUrl}")` : 'none',
    backgroundImage: backgroundUrl
      ? `url("${backgroundUrl}")`
      : `linear-gradient(180deg, ${theme.background[0]}, ${theme.background[1]})`,
  } as CSSProperties;

  return (
    <div className="themed" style={style}>
      {!backgroundUrl && (
        <div className="decorations" aria-hidden="true">
          {decorationLayout(seed).map((item) => (
            <span
              key={item.index}
              style={{ left: `${item.x}%`, top: `${item.y}%`, fontSize: item.size }}
            >
              {theme.decorations[item.index % theme.decorations.length]}
            </span>
          ))}
        </div>
      )}
      <div className="themed-content">{children}</div>
    </div>
  );
}
