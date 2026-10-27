// GET ?token=… – Link aus der Bestätigungsmail.
import { adminClient, webUrl } from '../_shared/env.ts';

const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!UUID.test(token)) return Response.redirect(`${webUrl()}/?fehler=link`, 302);

  const db = adminClient();
  const { data } = await db
    .from('subscriptions')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('token', token)
    .is('confirmed_at', null)
    .select('calendars(share_token)')
    .maybeSingle();

  let shareToken = (data?.calendars as { share_token?: string } | null)?.share_token;
  if (!shareToken) {
    // Bereits bestätigt: trotzdem zum Kalender weiterleiten.
    const { data: existing } = await db
      .from('subscriptions')
      .select('calendars(share_token)')
      .eq('token', token)
      .maybeSingle();
    shareToken = (existing?.calendars as { share_token?: string } | null)?.share_token;
  }
  if (!shareToken) return Response.redirect(`${webUrl()}/?fehler=link`, 302);
  return Response.redirect(`${webUrl()}/k/${shareToken}?bestaetigt=1`, 302);
});
