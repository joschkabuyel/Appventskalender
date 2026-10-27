import type { PublicDoor } from '@adventskalender/shared';
import { navigate } from './router';
import { mediaUrl } from './supabase';

interface Props {
  token: string;
  door: PublicDoor;
  year: number;
}

export function DoorDetail({ token, door, year }: Props) {
  const imageUrl = mediaUrl(door.image_path);
  const hasContent = Boolean(door.text?.trim()) || Boolean(imageUrl);

  return (
    <article className="door-detail">
      <header className="door-detail-header">
        <button type="button" className="back" onClick={() => navigate(`/k/${token}`)}>
          ← Zurück
        </button>
        <span className="door-detail-number">{door.day}</span>
      </header>

      {!door.unlocked ? (
        <div className="card">
          <p className="lock-big" aria-hidden="true">🔒</p>
          <p>
            Noch ein bisschen Geduld! Dieses Türchen öffnet sich am {door.day}. Dezember {year}.
          </p>
        </div>
      ) : !hasContent ? (
        <div className="card">
          <p>Hinter diesem Türchen ist heute nichts. Vielleicht morgen wieder? 🎁</p>
        </div>
      ) : (
        <div className="card door-content">
          {imageUrl && <img src={imageUrl} alt={`Bild hinter Türchen ${door.day}`} />}
          {door.text?.trim() && <blockquote>{door.text}</blockquote>}
        </div>
      )}
    </article>
  );
}
