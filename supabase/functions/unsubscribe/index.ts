// GET ?token=… (Link in jeder Mail) oder POST (One-Click-Unsubscribe nach RFC 8058).
import { adminClient, webUrl } from '../_shared/env.ts';

const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!UUID.test(token)) return Response.redirect(`${webUrl()}/?fehler=link`, 302);

  const { data } = await adminClient()
    .from('subscriptions')
    .delete()
    .eq('token', token)
    .select('calendars(share_token)')
    .maybeSingle();

  if (req.method === 'POST') return new Response(null, { status: 204 });
  const shareToken = (data?.calendars as { share_token?: string } | null)?.share_token;
  return Response.redirect(shareToken ? `${webUrl()}/k/${shareToken}?abgemeldet=1` : `${webUrl()}/?abgemeldet=1`, 302);
});
