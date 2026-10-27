import { berlinDate, type PublicDoor } from '@adventskalender/shared';
import { navigate } from './router';

interface Props {
  token: string;
  doors: PublicDoor[];
  opened: Set<number>;
  year: number;
}

export function DoorGrid({ token, doors, opened, year }: Props) {
  const today = berlinDate();
  const todayDay = today.year === year && today.month === 12 ? today.day : null;
  const openedCount = doors.filter((door) => door.unlocked && opened.has(door.day)).length;
  const unlockedCount = doors.filter((door) => door.unlocked).length;

  return (
    <section aria-label="Türchen">
      <p className="progress">
        {openedCount} von {unlockedCount} verfügbaren Türchen geöffnet
      </p>
      <ol className="door-grid">
        {doors.map((door) => {
          const isOpened = door.unlocked && opened.has(door.day);
          const isToday = door.day === todayDay;
          const state = !door.unlocked ? 'locked' : isOpened ? 'opened' : 'available';
          const label = !door.unlocked
            ? `Türchen ${door.day}, noch gesperrt`
            : isOpened
              ? `Türchen ${door.day}, bereits geöffnet`
              : `Türchen ${door.day} öffnen`;
          return (
            <li key={door.day}>
              <button
                type="button"
                className={`door door-${state}${isToday ? ' door-today' : ''}`}
                disabled={!door.unlocked}
                aria-label={label}
                onClick={() => navigate(`/k/${token}/${door.day}`)}
              >
                <span className="door-number">{door.day}</span>
                {state === 'locked' && <span className="door-badge" aria-hidden="true">🔒</span>}
                {state === 'opened' && <span className="door-badge" aria-hidden="true">✓</span>}
                {isToday && state === 'available' && <span className="door-today-label">Heute</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <ul className="legend" aria-label="Legende">
        <li><span className="legend-swatch door-available" /> verfügbar</li>
        <li><span className="legend-swatch door-opened" /> geöffnet</li>
        <li><span className="legend-swatch door-locked" /> gesperrt</li>
      </ul>
    </section>
  );
}
