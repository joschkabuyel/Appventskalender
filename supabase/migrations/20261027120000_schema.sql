-- Adventskalender: Grundschema
-- Ersteller melden sich anonym an (Supabase Anonymous Sign-In) und hinterlegen Name + E-Mail.
-- Empfänger lesen ausschließlich über die RPC get_public_calendar(share_token).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

-- Türchen `p_day` ist ab 00:00 Uhr Europe/Berlin am p_day. Dezember p_year offen.
create or replace function public.door_unlocked(p_year int, p_day int, p_now timestamptz default now())
returns boolean
language sql
stable
set search_path = ''
as $$
  select (p_now at time zone 'Europe/Berlin') >= make_timestamp(p_year, 12, p_day, 0, 0, 0);
$$;

-- Ein neuer Kalender gilt für diesen Dezember, nach Heiligabend für den nächsten.
create or replace function public.default_calendar_year()
returns int
language sql
stable
set search_path = ''
as $$
  select case
    when (now() at time zone 'Europe/Berlin')::date > make_date(extract(year from now() at time zone 'Europe/Berlin')::int, 12, 24)
      then extract(year from now() at time zone 'Europe/Berlin')::int + 1
    else extract(year from now() at time zone 'Europe/Berlin')::int
  end;
$$;

create or replace function public.generate_share_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/', '-_');
$$;

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table public.creators (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  created_at timestamptz not null default now()
);

create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  year int not null default public.default_calendar_year(),
  theme_id text not null default 'klassisch' check (theme_id ~ '^[a-z0-9-]{1,40}$'),
  custom_background_path text,
  custom_door_path text,
  share_token text not null unique default public.generate_share_token(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calendars_owner_idx on public.calendars (owner_id);

create table public.doors (
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  day smallint not null check (day between 1 and 24),
  text text check (char_length(text) <= 500),
  image_path text,
  updated_at timestamptz not null default now(),
  primary key (calendar_id, day)
);

-- E-Mail-Benachrichtigungen der Empfänger. Nur für den Service-Role-Key (Edge Functions) zugänglich.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  token uuid not null unique default gen_random_uuid(),
  confirmed_at timestamptz,
  confirmation_sent_at timestamptz,
  last_notified_day smallint,
  created_at timestamptz not null default now(),
  unique (calendar_id, email)
);

-- ---------------------------------------------------------------------------
-- Trigger
-- ---------------------------------------------------------------------------

-- Jeder Kalender bekommt sofort seine 24 Türchen.
create or replace function public.create_calendar_doors()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.doors (calendar_id, day)
  select new.id, d from generate_series(1, 24) as d;
  return new;
end;
$$;

create trigger calendars_create_doors
after insert on public.calendars
for each row execute function public.create_calendar_doors();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger calendars_touch before update on public.calendars
for each row execute function public.touch_updated_at();

-- Bereits geöffnete Türchen sind eingefroren: Alle Empfänger sehen dauerhaft denselben Inhalt.
create or replace function public.protect_unlocked_doors()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_year int;
begin
  if new.text is not distinct from old.text and new.image_path is not distinct from old.image_path then
    return new;
  end if;
  select year into v_year from public.calendars where id = old.calendar_id;
  if public.door_unlocked(v_year, old.day) then
    raise exception 'Türchen % ist bereits geöffnet und kann nicht mehr geändert werden.', old.day
      using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger doors_protect_unlocked before update on public.doors
for each row execute function public.protect_unlocked_doors();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.creators enable row level security;
alter table public.calendars enable row level security;
alter table public.doors enable row level security;
alter table public.subscriptions enable row level security;

create policy "Ersteller verwaltet eigenes Profil" on public.creators
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Ersteller liest eigene Kalender" on public.calendars
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Ersteller legt Kalender an" on public.calendars
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Ersteller ändert eigene Kalender" on public.calendars
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "Ersteller löscht eigene Kalender" on public.calendars
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy "Ersteller liest eigene Türchen" on public.doors
  for select to authenticated
  using (exists (select 1 from public.calendars c where c.id = calendar_id and c.owner_id = (select auth.uid())));
create policy "Ersteller ändert eigene Türchen" on public.doors
  for update to authenticated
  using (exists (select 1 from public.calendars c where c.id = calendar_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.calendars c where c.id = calendar_id and c.owner_id = (select auth.uid())));

-- Spaltenrechte: Jahr, Besitzer und Link sind nach dem Anlegen fest; Türchen entstehen nur per Trigger.
revoke all on public.creators, public.calendars, public.doors, public.subscriptions from anon, authenticated;
grant select, insert, update, delete on public.creators to authenticated;
grant select, delete on public.calendars to authenticated;
grant insert (title, theme_id) on public.calendars to authenticated;
grant update (title, theme_id, custom_background_path, custom_door_path) on public.calendars to authenticated;
grant select on public.doors to authenticated;
grant update (text, image_path) on public.doors to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Inhalte zwischen Türchen verschieben (Drag & Drop / Zufallsverteilung).
-- p_order[day] = Türchen, dessen bisheriger Inhalt künftig hinter `day` liegt.
create or replace function public.reorder_doors(p_calendar_id uuid, p_order int[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_year int;
begin
  select year into v_year from public.calendars where id = p_calendar_id;
  if not found then
    raise exception 'Kalender nicht gefunden.' using errcode = 'P0002';
  end if;

  if array_length(p_order, 1) is distinct from 24
     or (select array_agg(x order by x) from unnest(p_order) x) <> (select array_agg(d) from generate_series(1, 24) d) then
    raise exception 'Ungültige Reihenfolge.' using errcode = '22023';
  end if;

  if exists (
    select 1 from unnest(p_order) with ordinality as o(source_day, target_day)
    where (public.door_unlocked(v_year, o.target_day::int) or public.door_unlocked(v_year, o.source_day))
      and o.source_day <> o.target_day
  ) then
    raise exception 'Bereits geöffnete Türchen können nicht verschoben werden.' using errcode = 'P0001';
  end if;

  update public.doors d
  set text = s.text, image_path = s.image_path
  from unnest(p_order) with ordinality as o(source_day, target_day)
  join public.doors s on s.calendar_id = p_calendar_id and s.day = o.source_day
  where d.calendar_id = p_calendar_id
    and d.day = o.target_day
    and o.source_day <> o.target_day;
end;
$$;

grant execute on function public.reorder_doors(uuid, int[]) to authenticated;

-- Öffentliche Ansicht für Empfänger: Inhalte nur für freigeschaltete Türchen.
create or replace function public.get_public_calendar(p_share_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'title', c.title,
    'year', c.year,
    'theme_id', c.theme_id,
    'custom_background_path', c.custom_background_path,
    'custom_door_path', c.custom_door_path,
    'creator_name', coalesce(cr.name, ''),
    'doors', (
      select jsonb_agg(
        jsonb_build_object(
          'day', d.day,
          'unlocked', public.door_unlocked(c.year, d.day),
          'text', case when public.door_unlocked(c.year, d.day) then d.text end,
          'image_path', case when public.door_unlocked(c.year, d.day) then d.image_path end
        ) order by d.day)
      from public.doors d
      where d.calendar_id = c.id
    )
  )
  from public.calendars c
  left join public.creators cr on cr.id = c.owner_id
  where c.share_token = p_share_token;
$$;

revoke execute on function public.get_public_calendar(text) from public;
grant execute on function public.get_public_calendar(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: Fotos & eigene Designs
-- Pfad: <owner_id>/<calendar_id>/<zufällige-uuid>.<ext>
-- Öffentlicher Bucket, die zufälligen Pfade werden erst nach Freischaltung herausgegeben.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('calendar-media', 'calendar-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Ersteller lädt in eigenen Ordner hoch" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'calendar-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Ersteller sieht eigene Dateien" on storage.objects
  for select to authenticated
  using (bucket_id = 'calendar-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Ersteller ersetzt eigene Dateien" on storage.objects
  for update to authenticated
  using (bucket_id = 'calendar-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Ersteller löscht eigene Dateien" on storage.objects
  for delete to authenticated
  using (bucket_id = 'calendar-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
