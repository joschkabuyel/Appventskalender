-- Tests für Schema, RLS und RPCs. Bricht beim ersten Fehler ab.
\set ON_ERROR_STOP on

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b');

create function pg_temp.login(p_uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_uid, false);
$$;

-- Freischaltlogik (CET): 30.11. 23:30 UTC ist schon der 1.12.
do $$ begin
  assert public.door_unlocked(2026, 1, '2026-11-30 23:30:00+00'), 'Tür 1 sollte offen sein';
  assert not public.door_unlocked(2026, 1, '2026-11-30 22:59:00+00'), 'Tür 1 sollte zu sein';
  assert not public.door_unlocked(2026, 6, '2026-12-05 12:00:00+00'), 'Tür 6 sollte zu sein';
end $$;

-- Ersteller A legt Profil + Kalender an
set role authenticated;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
insert into public.creators (name, email) values ('Anna', 'anna@example.org');
insert into public.calendars (title) values ('Für die Familie');

do $$
declare v_count int;
begin
  select count(*) into v_count from public.doors;
  assert v_count = 24, format('24 Türchen erwartet, %s gefunden', v_count);
end $$;

-- Inhalte setzen und verschieben
update public.doors set text = 'Zitat ' || day where day <= 3;
do $$
declare v_id uuid; v_order int[];
begin
  select id into v_id from public.calendars;
  v_order := array[3, 1, 2] || array(select generate_series(4, 24));
  perform public.reorder_doors(v_id, v_order);
  assert (select text from public.doors where day = 1) = 'Zitat 3', 'Reorder Tür 1';
  assert (select text from public.doors where day = 2) = 'Zitat 1', 'Reorder Tür 2';
  assert (select text from public.doors where day = 3) = 'Zitat 2', 'Reorder Tür 3';
end $$;

-- Ungültige Reihenfolgen werden abgelehnt
do $$
declare v_id uuid;
begin
  select id into v_id from public.calendars;
  begin
    perform public.reorder_doors(v_id, array[1, 1] || array(select generate_series(3, 24)));
    raise exception 'Doppelte Reihenfolge wurde akzeptiert';
  exception when sqlstate '22023' then null;
  end;
end $$;

-- Jahr und Link sind nicht änderbar
do $$ begin
  begin
    update public.calendars set year = 2020;
    raise exception 'Jahr war änderbar';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.doors (calendar_id, day) select id, 1 from public.calendars;
    raise exception 'Türchen-Insert war erlaubt';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Ersteller B sieht nichts von A
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert (select count(*) from public.calendars) = 0, 'B sieht Kalender von A';
  assert (select count(*) from public.doors) = 0, 'B sieht Türchen von A';
end $$;
update public.doors set text = 'gehackt';
do $$ declare v_id uuid; begin
  select id into v_id from public.calendars;
  assert v_id is null;
end $$;

reset role;
do $$ begin
  assert not exists (select 1 from public.doors where text = 'gehackt'), 'B konnte Türchen von A ändern';
end $$;

-- B kann nicht umsortieren (Kalender nicht gefunden)
set role authenticated;
do $$
declare v_id uuid;
begin
  reset role;
  select id into v_id from public.calendars;
  set role authenticated;
  begin
    perform public.reorder_doors(v_id, array(select generate_series(24, 1, -1)));
    raise exception 'B konnte umsortieren';
  exception when sqlstate 'P0002' then null;
  end;
end $$;

-- Vergangener Kalender (alle Türchen offen): Inhalte sind eingefroren
reset role;
insert into public.calendars (owner_id, title, year, share_token)
values ('00000000-0000-0000-0000-00000000000a', 'Letztes Jahr', 2025, 'vergangen');
insert into public.calendars (owner_id, title, year, share_token)
values ('00000000-0000-0000-0000-00000000000a', 'Nächstes Jahr', 2099, 'zukunft');
update public.doors set text = 'alt'
  where calendar_id = (select id from public.calendars where share_token = 'zukunft') and day = 1;

set role authenticated;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$ begin
  begin
    update public.doors set text = 'neu'
      where calendar_id = (select id from public.calendars where share_token = 'vergangen') and day = 5;
    raise exception 'Offenes Türchen war änderbar';
  exception when sqlstate 'P0001' then null;
  end;
  begin
    perform public.reorder_doors((select id from public.calendars where share_token = 'vergangen'),
      array(select generate_series(24, 1, -1)));
    raise exception 'Offene Türchen waren verschiebbar';
  exception when sqlstate 'P0001' then null;
  end;
end $$;

-- Öffentliche Ansicht als anonymer Empfänger
set role anon;
select pg_temp.login('');
do $$
declare v jsonb;
begin
  assert (select count(*) from public.calendars) = 0, 'anon darf Tabellen nicht lesen';
exception when insufficient_privilege then null;
end $$;

do $$
declare v jsonb;
begin
  v := public.get_public_calendar('zukunft');
  assert v ->> 'title' = 'Nächstes Jahr';
  assert v ->> 'creator_name' = 'Anna';
  assert jsonb_array_length(v -> 'doors') = 24;
  assert (v -> 'doors' -> 0 ->> 'unlocked')::boolean = false;
  assert v -> 'doors' -> 0 ->> 'text' is null, 'Gesperrter Inhalt wurde ausgeliefert';

  v := public.get_public_calendar('vergangen');
  assert (v -> 'doors' -> 23 ->> 'unlocked')::boolean = true;

  assert public.get_public_calendar('gibtsnicht') is null;
end $$;

-- Löschen entfernt Türchen mit
set role authenticated;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
delete from public.calendars where share_token = 'zukunft';
reset role;
do $$ begin
  assert (select count(*) from public.doors d join public.calendars c on c.id = d.calendar_id where c.share_token = 'zukunft') = 0;
  assert (select count(*) from public.doors) = 48;
end $$;

\echo 'ALLE SCHEMA-TESTS BESTANDEN'
