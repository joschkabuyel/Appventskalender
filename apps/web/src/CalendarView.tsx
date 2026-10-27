import { berlinDate, getTheme, type PublicCalendar } from '@adventskalender/shared';
import { useCallback, useEffect, useState } from 'react';
import { Notice } from './Notice';
import { DoorGrid } from './DoorGrid';
import { DoorDetail } from './DoorDetail';
import { loadOpened, markOpened } from './opened';
import { SubscribeForm } from './SubscribeForm';
import { fetchCalendar, mediaUrl } from './supabase';
import { ThemeBackground } from './ThemeBackground';

interface Props {
  token: string;
  day: number | null;
  params: URLSearchParams;
}

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'missing' }
  | { status: 'ready'; calendar: PublicCalendar };

export function CalendarView({ token, day, params }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [opened, setOpened] = useState(() => loadOpened(token));

  const load = useCallback(async () => {
    try {
      const calendar = await fetchCalendar(token);
      setState(calendar ? { status: 'ready', calendar } : { status: 'missing' });
    } catch {
      setState((current) => (current.status === 'ready' ? current : { status: 'error' }));
    }
  }, [token]);

  useEffect(() => {
    load();
    // Beim Zurückkehren in den Tab neu laden, damit um Mitternacht das neue Türchen erscheint.
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const selectedDoor = state.status === 'ready' && day ? state.calendar.doors.find((d) => d.day === day) : undefined;

  useEffect(() => {
    if (selectedDoor?.unlocked) setOpened(markOpened(token, selectedDoor.day));
  }, [selectedDoor?.unlocked, selectedDoor?.day, token]);

  useEffect(() => {
    if (state.status === 'ready') document.title = `${state.calendar.title} · Adventskalender`;
  }, [state]);

  if (state.status === 'loading') return <div className="loading">🎄</div>;
  if (state.status === 'error') {
    return <Notice title="Verbindung fehlgeschlagen" text="Der Kalender konnte nicht geladen werden. Bitte versuche es gleich noch einmal." />;
  }
  if (state.status === 'missing') {
    return <Notice title="Kalender nicht gefunden" text="Dieser Kalender existiert nicht (mehr). Vielleicht wurde er gelöscht." />;
  }

  const { calendar } = state;
  const theme = getTheme(calendar.theme_id);
  const backgroundUrl = mediaUrl(calendar.custom_background_path);
  const doorImageUrl = mediaUrl(calendar.custom_door_path);

  return (
    <ThemeBackground theme={theme} seed={token} backgroundUrl={backgroundUrl} doorImageUrl={doorImageUrl}>
      {selectedDoor ? (
        <DoorDetail token={token} door={selectedDoor} year={calendar.year} />
      ) : (
        <>
          <header className="calendar-header">
            <h1>{calendar.title}</h1>
            {calendar.creator_name && <p className="subtitle">von {calendar.creator_name}</p>}
          </header>
          {params.has('bestaetigt') && (
            <p className="banner">✅ Deine E-Mail-Adresse ist bestätigt. Ab dem 1. Dezember erinnern wir dich jeden Morgen um 7:00 Uhr.</p>
          )}
          {params.has('abgemeldet') && <p className="banner">Du bekommst keine Erinnerungen mehr.</p>}
          <Countdown year={calendar.year} />
          <DoorGrid token={token} doors={calendar.doors} opened={opened} year={calendar.year} />
          <SubscribeForm token={token} />
        </>
      )}
    </ThemeBackground>
  );
}

function Countdown({ year }: { year: number }) {
  const today = berlinDate();
  if (today.year > year || (today.year === year && today.month === 12)) return null;
  const start = Date.UTC(year, 11, 1);
  const now = Date.UTC(today.year, today.month - 1, today.day);
  const days = Math.round((start - now) / 86_400_000);
  return (
    <p className="banner">
      {days === 1 ? 'Morgen' : `In ${days} Tagen`} öffnet sich das erste Türchen. Bis dahin: Vorfreude! ✨
    </p>
  );
}
