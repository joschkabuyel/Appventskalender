import { parseCalendarPath } from '@adventskalender/shared';
import { CalendarView } from './CalendarView';
import { Notice } from './Notice';
import { useLocation } from './router';
import { configured } from './supabase';

export function App() {
  const { pathname, search } = useLocation();
  const route = parseCalendarPath(pathname);
  const params = new URLSearchParams(search);

  if (!configured) {
    return <Notice title="Noch nicht eingerichtet" text="VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY fehlen." />;
  }
  if (route) {
    return <CalendarView token={route.token} day={route.day} params={params} />;
  }
  if (params.has('abgemeldet')) {
    return <Notice title="Abgemeldet" text="Du bekommst keine Erinnerungen mehr." />;
  }
  if (params.get('fehler') === 'link') {
    return <Notice title="Link ungültig" text="Dieser Link ist abgelaufen oder ungültig." />;
  }
  return (
    <Notice
      title="🎄 Adventskalender"
      text="Öffne den Link, den du von der Person bekommen hast, die den Kalender für dich gestaltet hat."
    />
  );
}
