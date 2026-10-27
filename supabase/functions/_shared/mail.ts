import { requireEnv } from './env.ts';

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl?: string;
}

const RESEND_API = 'https://api.resend.com';

function toResend(mail: Mail) {
  return {
    from: requireEnv('MAIL_FROM'),
    to: [mail.to],
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    headers: mail.unsubscribeUrl
      ? { 'List-Unsubscribe': `<${mail.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
      : undefined,
  };
}

async function post(path: string, body: unknown): Promise<void> {
  const response = await fetch(`${RESEND_API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${requireEnv('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Mailversand fehlgeschlagen (${response.status}): ${await response.text()}`);
  }
}

export function sendMail(mail: Mail): Promise<void> {
  return post('/emails', toResend(mail));
}

/** Versendet bis zu 100 Mails in einem Aufruf (Resend-Batch-Limit). */
export function sendMailBatch(mails: Mail[]): Promise<void> {
  if (mails.length > 100) throw new Error('Maximal 100 Mails pro Batch');
  return post('/emails/batch', mails.map(toResend));
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Schlichtes, mailclient-taugliches Layout. */
export function layout(title: string, bodyHtml: string, footerHtml = ''): string {
  return `<!doctype html>
<html lang="de"><body style="margin:0;background:#f6f1e9;font-family:Arial,Helvetica,sans-serif;color:#2b2118">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;border-top:6px solid #b3261e">
<tr><td style="padding:24px">
<h1 style="margin:0 0 16px;font-size:22px;color:#b3261e">${escapeHtml(title)}</h1>
${bodyHtml}
</td></tr></table>
<p style="font-size:12px;color:#7a6a5a;max-width:480px">${footerHtml}</p>
</td></tr></table>
</body></html>`;
}

export function button(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="background:#b3261e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:bold">${escapeHtml(label)}</a></p>`;
}
