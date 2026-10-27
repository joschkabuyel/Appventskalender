import { createClient } from '@supabase/supabase-js';
import { MEDIA_BUCKET, type PublicCalendar } from '@adventskalender/shared';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configured = Boolean(url && key);

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function fetchCalendar(shareToken: string): Promise<PublicCalendar | null> {
  const { data, error } = await supabase.rpc('get_public_calendar', { p_share_token: shareToken });
  if (error) throw error;
  return (data as PublicCalendar | null) ?? null;
}

export function mediaUrl(path: string | null): string | null {
  return path ? supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl : null;
}

export async function subscribe(shareToken: string, email: string): Promise<'pending' | 'already_confirmed'> {
  const { data, error } = await supabase.functions.invoke('subscribe', {
    body: { share_token: shareToken, email },
  });
  if (error) {
    let message = 'Die Anmeldung hat nicht geklappt. Bitte versuche es später erneut.';
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      const body = await context.json().catch(() => null);
      if (body?.error) message = body.error;
    }
    throw new Error(message);
  }
  return data.status;
}
