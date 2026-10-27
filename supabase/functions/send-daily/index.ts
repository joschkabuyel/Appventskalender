// Wird per pg_cron am 1.–24.12. um 07:00 CET aufgerufen (Header x-cron-secret).
// Benachrichtigt alle bestätigten Empfänger über das heutige Türchen. Mehrfache Aufrufe am selben
// Tag sind unschädlich, da last_notified_day gemerkt wird.
import { adminClient, functionsUrl, json, requireEnv, webUrl } from '../_shared/env.ts';
import { berlinDate } from '../_shared/berlin.ts';
import { button, escapeHtml, layout, type Mail, sendMailBatch } from '../_shared/mail.ts';

const PAGE_SIZE = 100;

interface Row {
  id: string;
  email: string;
  token: string;
  calendars: { title: string; share_token: string };
}

function buildMail(row: Row, day: number): Mail {
  const { title, share_token } = row.calendars;
  const doorUrl = `${webUrl()}/k/${share_token}/${day}`;
  const unsubscribeUrl = `${functionsUrl()}/unsubscribe?token=${row.token}`;
  return {
    to: row.email,
    subject: `🎄 Türchen ${day} ist offen – ${title}`,
    html: layout(
      `Türchen ${day} ist offen!`,
      `<p>Guten Morgen! Im Adventskalender <strong>„${escapeHtml(title)}“</strong> wartet heute etwas Neues auf dich.</p>
       ${button(doorUrl, `Türchen ${day} öffnen`)}`,
      `Du bekommst diese Mail, weil du dich für den Adventskalender angemeldet hast. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#7a6a5a">Abmelden</a>`,
    ),
    text: `Guten Morgen! Türchen ${day} im Adventskalender „${title}“ ist offen:\n${doorUrl}\n\nAbmelden: ${unsubscribeUrl}`,
    unsubscribeUrl,
  };
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== requireEnv('CRON_SECRET')) {
    return json({ error: 'Nicht autorisiert' }, 401);
  }

  const today = berlinDate();
  if (today.month !== 12 || today.day > 24) return json({ status: 'skipped', reason: 'Kein Adventstag' });

  const db = adminClient();
  let sent = 0;
  let failed = 0;

  // Immer die erste Seite holen: erfolgreich benachrichtigte Zeilen fallen aus dem Filter heraus.
  for (;;) {
    const { data, error } = await db
      .from('subscriptions')
      .select('id, email, token, calendars!inner(title, share_token, year)')
      .not('confirmed_at', 'is', null)
      .eq('calendars.year', today.year)
      .or(`last_notified_day.is.null,last_notified_day.lt.${today.day}`)
      .order('id')
      .limit(PAGE_SIZE);
    if (error) return json({ error: error.message, sent }, 500);
    const rows = (data ?? []) as unknown as Row[];
    if (rows.length === 0) break;

    try {
      await sendMailBatch(rows.map((row) => buildMail(row, today.day)));
      sent += rows.length;
    } catch (mailError) {
      console.error(mailError);
      failed += rows.length;
      break; // Nicht endlos wiederholen; der nächste Aufruf holt die restlichen nach.
    }

    const { error: updateError } = await db
      .from('subscriptions')
      .update({ last_notified_day: today.day })
      .in('id', rows.map((row) => row.id));
    if (updateError) return json({ error: updateError.message, sent }, 500);
  }

  return json({ status: 'done', day: today.day, sent, failed });
});
