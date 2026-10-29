# 🎄 Appventskalender

Persönliche Adventskalender verschenken: Ersteller gestalten in der **Android-App** 24 Türchen mit Text, Zitat und/oder Foto und teilen einen Link. Empfänger öffnen ihn auf der **mobilen Website**, ganz ohne Konto und mit optionaler täglicher E-Mail um 07:00 Uhr.

```
apps/mobile      Expo-App (React Native, Expo Router) für Ersteller
apps/web         Vite + React Website für Empfänger
packages/shared  Gemeinsame Logik: Freischaltung (Europe/Berlin), Mischen/Drag & Drop, Designs, Typen
supabase/        Datenbank-Migrationen, Edge Functions (E-Mail), Tests
```

## Wie es funktioniert

| Thema | Umsetzung |
| --- | --- |
| Anmeldung Ersteller | Kein Passwort: beim ersten Start legt die App ein anonymes Supabase-Konto an, Name und E-Mail werden im Profil (`creators`) gespeichert. |
| Freischaltung | Türchen *n* ist ab 00:00 Uhr Europe/Berlin (CET) am *n*. Dezember offen. Die Prüfung läuft **serverseitig** in `get_public_calendar`: Inhalte gesperrter Türchen verlassen nie die Datenbank. |
| Bearbeiten nach dem Teilen | Inhalte gesperrter Türchen bleiben änderbar und erscheinen sofort bei allen Empfängern. Geöffnete Türchen sind per Trigger eingefroren, damit alle denselben Inhalt sehen. |
| Mischen / Drag & Drop | RPC `reorder_doors` verschiebt Inhalte zwischen noch gesperrten Türchen in einer Transaktion. |
| Bilder | Eigene Fotos werden in der App auf max. 1600 px verkleinert (JPEG) und in den Storage-Bucket `calendar-media` geladen (Limit 5 MB). Dateinamen sind zufällige UUIDs. |
| „Geöffnet“-Status | Pro Browser im `localStorage`, da Empfänger kein Konto haben. |
| E-Mail-Benachrichtigung | Double-Opt-in über die Website → Edge Function `subscribe`. `pg_cron` ruft am 1.–24.12. um 06:00 UTC (= 07:00 CET) `send-daily` auf, das per [Resend](https://resend.com) verschickt. Abmelden per Link in jeder Mail. |
| Löschen | Löscht Kalender, Türchen, Bilder und Anmeldungen. Der Link zeigt danach „Kalender nicht gefunden“. |

### Designs (Epic 1.5)

Fünf Vorlagen: **Klassisch** (Tannengrün/Rot/Gold), **Winterwunderland** (Eisblau, Schnee), **Lebkuchen** (warme Brauntöne), **Heilige Nacht** (Nachtblau/Gold) und **Nordisch** (Weiß/Rot, skandinavisch). Definiert in `packages/shared/src/themes.ts`.

Zusätzlich können Ersteller eigene Bilder hochladen. Die Vorgaben stehen in der App und werden beim Upload geprüft:

| | Hintergrundbild | Türchen-Motiv |
| --- | --- | --- |
| Format | JPG, PNG oder WebP | PNG (Transparenz ideal), JPG oder WebP |
| Seitenverhältnis | Hochformat 9:16 | Quadratisch 1:1 |
| Auflösung | empfohlen 1080 × 1920 px, mindestens 720 × 1280 px | empfohlen 512 × 512 px, mindestens 256 × 256 px |
| Dateigröße | max. 5 MB | max. 5 MB |
| Tipp | Ruhige Motive, Wichtiges mittig (Ränder werden je nach Display beschnitten) | Mitte hell/ruhig halten, die Nummer liegt darüber |

## Einrichtung

### 1. Supabase (kostenloser Plan reicht)

1. Projekt auf [supabase.com](https://supabase.com) anlegen.
2. **Authentication → Sign In / Providers → „Allow anonymous sign-ins“** aktivieren.
3. Migrationen einspielen (Supabase CLI):
   ```bash
   npx supabase login
   npx supabase link --project-ref <PROJECT_REF>
   npx supabase db push
   ```
4. Im SQL-Editor die Vault-Secrets für den täglichen Cron-Job anlegen:
   ```sql
   select vault.create_secret('https://<PROJECT_REF>.supabase.co', 'project_url');
   select vault.create_secret('<zufälliger-langer-wert>', 'cron_secret');
   ```
5. E-Mail-Versand: Konto bei [Resend](https://resend.com) anlegen, Absender-Domain verifizieren, API-Key erzeugen.
6. Secrets für die Edge Functions setzen und deployen:
   ```bash
   npx supabase secrets set \
     RESEND_API_KEY=re_... \
     MAIL_FROM="Adventskalender <kalender@deine-domain.de>" \
     WEB_URL=https://dein-adventskalender.pages.dev \
     CRON_SECRET=<derselbe-wert-wie-im-vault>
   npx supabase functions deploy subscribe confirm-subscription unsubscribe send-daily
   ```

### 2. Website (apps/web)

```bash
cp apps/web/.env.example apps/web/.env    # URL + anon/publishable key eintragen
npm install
npm run web                               # http://localhost:5173/k/<share_token>
npm run build -w web                      # statische Dateien in apps/web/dist
```

Hosting kostenlos über **Cloudflare Workers** (Workers & Pages → Create → Repository verbinden). Build command: `npm run build -w web`, Deploy command: `npx wrangler deploy`. Als Build-Variablen `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` und `NODE_VERSION=22` setzen. Die Datei `wrangler.jsonc` sorgt dafür, dass Links wie `/k/abc` direkt funktionieren.

### 3. App (apps/mobile)

```bash
cp apps/mobile/.env.example apps/mobile/.env   # Supabase + URL der Website eintragen
npm run mobile                                  # Expo Dev Server, App „Expo Go“ auf Android scannen
```

**Hinweis zu Expo Go:** Die Expo-Go-App aus dem Play Store unterstützt nicht immer das aktuelle SDK. Bietet `expo start` an, das Projekt auf ein älteres SDK „anzupassen“, unbedingt **ablehnen**. Stattdessen einmalig einen Development-Build bauen (kostenlos in der Expo-Cloud):

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile development
```

Die fertige APK aufs Handy laden und installieren. Danach startet `npx expo start` den Dev-Server, und die installierte App verbindet sich damit (QR-Code mit der App oder der Kamera scannen).

Eine installierbare Test-APK ohne Dev-Server baut `--profile preview`, die Play-Store-Version `--profile production`. Für diese beiden Profile müssen die `EXPO_PUBLIC_…`-Werte als EAS-Umgebungsvariablen hinterlegt sein (`npx eas-cli@latest env:create`), weil die `.env`-Datei nicht hochgeladen wird. Vorher den Paketnamen `de.adventskalender.app` in `apps/mobile/app.json` anpassen.

## Tests & Checks

```bash
npm test                      # Unit-Tests der gemeinsamen Logik (vitest)
npm run typecheck             # TypeScript für shared, web und mobile
supabase/tests/run.sh         # Schema, RLS & RPCs gegen ein temporäres Postgres (benötigt initdb/pg_ctl)
npx deno check supabase/functions/*/index.ts
```

## Kosten (Stand Oktober 2026, bitte vor dem Start prüfen)

Alles läuft in kostenlosen Plänen, mit diesen Grenzen:

- **Supabase Free:** 500 MB Datenbank, 1 GB Dateispeicher (bei ~300 KB pro Foto etwa 3.000 Fotos), 5 GB Traffic pro Monat. **Achtung:** Kostenlose Projekte werden nach 7 Tagen ohne Aktivität pausiert. Vor allem zwischen Erstellung und Dezember sollte das Projekt regelmäßig genutzt werden.
- **Resend Free:** 3.000 Mails pro Monat, **100 pro Tag**. Das reicht für etwa 100 angemeldete Empfänger insgesamt. Darüber hinaus ist ein bezahlter Plan oder ein anderer Anbieter nötig (der Versand ist in `supabase/functions/_shared/mail.ts` gekapselt).
- **Cloudflare Workers:** kostenlos für diese Website.
- **Google Play:** einmalig 25 US-$ für das Entwicklerkonto, falls die App in den Store soll. Eine APK lässt sich auch direkt verteilen.

## Noch offen / nächste Schritte

- WhatsApp- und Signal-Benachrichtigungen (Epic 2.3 und 2.4): bewusst zurückgestellt. Der Versand ist so gekapselt, dass weitere Kanäle neben `sendMailBatch` ergänzt werden können.
- Ohne Login hängen die Kalender am Gerät. Wird die App gelöscht oder das Handy gewechselt, lassen sie sich nicht mehr bearbeiten (der Link funktioniert weiter). Später möglich: das anonyme Konto per E-Mail-Bestätigung dauerhaft machen (`supabase.auth.updateUser({ email })`).
