-- Tägliche Benachrichtigung am 1.–24. Dezember um 07:00 Uhr CET (= 06:00 UTC).
-- Erwartet zwei Einträge im Supabase Vault (siehe README):
--   project_url  z. B. https://abcd1234.supabase.co
--   cron_secret  derselbe Wert wie das Edge-Function-Secret CRON_SECRET
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'adventskalender-taeglich',
  '0 6 1-24 12 *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-daily',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
