// POST { share_token, email } – meldet einen Empfänger für die tägliche E-Mail an (Double-Opt-in).
import { adminClient, corsHeaders, EMAIL_PATTERN, functionsUrl, json } from '../_shared/env.ts';
import { button, escapeHtml, layout, sendMail } from '../_shared/mail.ts';

const MAX_SUBSCRIPTIONS_PER_CALENDAR = 500;
const RESEND_COOLDOWN_MS = 15 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Methode nicht erlaubt' }, 405);

  let body: { share_token?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }
  const shareToken = typeof body.share_token === 'string' ? body.share_token : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!shareToken || !EMAIL_PATTERN.test(email) || email.length > 254) {
    return json({ error: 'Bitte gib eine gültige E-Mail-Adresse ein.' }, 400);
  }

  const db = adminClient();
  const { data: calendar, error: calendarError } = await db
    .from('calendars')
    .select('id, title')
    .eq('share_token', shareToken)
    .maybeSingle();
  if (calendarError) return json({ error: 'Serverfehler' }, 500);
  if (!calendar) return json({ error: 'Kalender nicht gefunden.' }, 404);

  const { data: existing } = await db
    .from('subscriptions')
    .select('id, token, confirmed_at, confirmation_sent_at')
    .eq('calendar_id', calendar.id)
    .eq('email', email)
    .maybeSingle();

  if (existing?.confirmed_at) return json({ status: 'already_confirmed' });

  if (existing?.confirmation_sent_at && Date.now() - Date.parse(existing.confirmation_sent_at) < RESEND_COOLDOWN_MS) {
    // Schutz vor Mail-Bombing: Bestätigung höchstens alle 15 Minuten erneut senden.
    return json({ status: 'pending' });
  }

  let token = existing?.token as string | undefined;
  if (!existing) {
    const { count } = await db
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('calendar_id', calendar.id);
    if ((count ?? 0) >= MAX_SUBSCRIPTIONS_PER_CALENDAR) {
      return json({ error: 'Für diesen Kalender sind keine weiteren Anmeldungen möglich.' }, 429);
    }
    const { data: inserted, error } = await db
      .from('subscriptions')
      .insert({ calendar_id: calendar.id, email })
      .select('token')
      .single();
    if (error) return json({ error: 'Anmeldung fehlgeschlagen.' }, 500);
    token = inserted.token;
  }

  const confirmUrl = `${functionsUrl()}/confirm-subscription?token=${token}`;
  const unsubscribeUrl = `${functionsUrl()}/unsubscribe?token=${token}`;
  const title = calendar.title as string;
  try {
    await sendMail({
      to: email,
      subject: `Bitte bestätige deine Anmeldung zum Adventskalender „${title}“`,
      html: layout(
        'Fast geschafft! 🎄',
        `<p>Du möchtest jeden Morgen um 7:00 Uhr erinnert werden, wenn im Adventskalender <strong>„${escapeHtml(title)}“</strong> ein neues Türchen aufgeht.</p>
         <p>Bitte bestätige deine E-Mail-Adresse:</p>
         ${button(confirmUrl, 'Anmeldung bestätigen')}
         <p style="font-size:13px;color:#7a6a5a">Du hast dich nicht angemeldet? Dann ignoriere diese Mail einfach.</p>`,
      ),
      text: `Bitte bestätige deine Anmeldung zum Adventskalender „${title}“:\n${confirmUrl}\n\nDu hast dich nicht angemeldet? Dann ignoriere diese Mail einfach.`,
      unsubscribeUrl,
    });
  } catch (error) {
    console.error(error);
    return json({ error: 'Die Bestätigungsmail konnte nicht versendet werden.' }, 502);
  }

  await db.from('subscriptions').update({ confirmation_sent_at: new Date().toISOString() }).eq('token', token);
  return json({ status: 'pending' });
});
