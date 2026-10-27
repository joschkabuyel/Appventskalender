import { useState, type FormEvent } from 'react';
import { subscribe } from './supabase';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; text: string } | { kind: 'error'; text: string };

export function SubscribeForm({ token }: { token: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus({ kind: 'sending' });
    try {
      const result = await subscribe(token, email);
      setStatus({
        kind: 'done',
        text:
          result === 'already_confirmed'
            ? 'Du bist schon angemeldet. 🎉'
            : 'Fast geschafft! Bitte bestätige den Link in der Mail, die wir dir gerade geschickt haben.',
      });
    } catch (error) {
      setStatus({ kind: 'error', text: (error as Error).message });
    }
  }

  return (
    <section className="card subscribe">
      <h2>📬 Tägliche Erinnerung</h2>
      <p>Wir schicken dir am 1. bis 24. Dezember jeden Morgen um 7:00 Uhr eine E-Mail, sobald das neue Türchen offen ist.</p>
      {status.kind === 'done' ? (
        <p role="status">{status.text}</p>
      ) : (
        <form onSubmit={onSubmit}>
          <label htmlFor="email" className="visually-hidden">E-Mail-Adresse</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="deine@email.de"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="submit" disabled={status.kind === 'sending'}>
            {status.kind === 'sending' ? 'Wird gesendet …' : 'Anmelden'}
          </button>
        </form>
      )}
      {status.kind === 'error' && <p className="error" role="alert">{status.text}</p>}
      <p className="fineprint">Deine Adresse wird nur für diese Erinnerungen genutzt. Abmelden geht jederzeit per Link in jeder Mail.</p>
    </section>
  );
}
