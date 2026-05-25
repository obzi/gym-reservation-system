-- =============================================================
-- MIGRACE GYM RESERVATION SYSTEM NA NOVÝ SUPABASE
-- =============================================================
-- Postup:
--   ČÁST A: Spusť na NOVÉM Supabase (SQL Editor) — vytvoří schéma
--   ČÁST B: Spusť na STARÉM Supabase (SQL Editor) — vyexportuje data
--   ČÁST C: Vyplň exportovaná data a spusť na NOVÉM Supabase
--   ČÁST D: Konfigurace nového projektu
-- =============================================================


-- =============================================================
-- ČÁST A — SCHEMA (spusť na NOVÉM Supabase)
-- =============================================================

-- ---- 001: initial schema ----

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  active boolean not null default true
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Admins can update any profile"
  on public.profiles for update
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete any profile"
  on public.profiles for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    'user'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.reservations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now() not null,
  constraint valid_time_range check (start_time < end_time)
);

alter table public.reservations enable row level security;

create policy "Users can view all reservations"
  on public.reservations for select
  to authenticated
  using (true);

create policy "Users can insert own reservations"
  on public.reservations for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and active = true)
  );

create policy "Users can delete own reservations"
  on public.reservations for delete
  to authenticated
  using (user_id = auth.uid());

create policy "Admins can delete any reservation"
  on public.reservations for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create table public.invite_tokens (
  id uuid default gen_random_uuid() primary key,
  token uuid default gen_random_uuid() not null unique,
  expires_at timestamptz not null,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz default now() not null
);

alter table public.invite_tokens enable row level security;

create policy "Anyone can read valid tokens"
  on public.invite_tokens for select
  using (true);

create policy "Admins can create invite tokens"
  on public.invite_tokens for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete invite tokens"
  on public.invite_tokens for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ---- 002: gym settings ----

create table public.gym_settings (
  id int primary key default 1 check (id = 1),
  max_overlap int not null default 3,
  max_advance_days int not null default 3,
  opening_hour int not null default 7,
  closing_hour int not null default 22,
  slot_minutes int not null default 15,
  min_duration_minutes int not null default 15,
  max_duration_minutes int not null default 120
);

alter table public.gym_settings enable row level security;

create policy "Authenticated users can read settings"
  on public.gym_settings for select
  to authenticated
  using (true);

create policy "Admins can update settings"
  on public.gym_settings for update
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

insert into public.gym_settings (id) values (1);

-- ---- 004: opening/closing minutes ----

alter table public.gym_settings add column opening_minute int not null default 0;
alter table public.gym_settings add column closing_minute int not null default 0;

-- ---- create_reservation function (finální verze) ----

create or replace function public.create_reservation(
  p_date date,
  p_start_time time,
  p_end_time time
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_slot_time time;
  v_overlap_count int;
  v_active boolean;
  v_advance_days int;
  v_settings record;
  v_duration_minutes numeric;
  v_opening time;
  v_closing time;
begin
  select * into v_settings from public.gym_settings where id = 1;
  v_opening := make_time(v_settings.opening_hour, v_settings.opening_minute, 0);
  v_closing := make_time(v_settings.closing_hour, v_settings.closing_minute, 0);

  select active into v_active from public.profiles where id = v_user_id;
  if not v_active then
    return jsonb_build_object('error', 'Váš účet je deaktivován');
  end if;

  if p_start_time < v_opening then
    return jsonb_build_object('error', 'Rezervace mimo otevírací dobu');
  end if;
  if p_end_time > v_closing then
    return jsonb_build_object('error', 'Rezervace mimo otevírací dobu');
  end if;

  if p_start_time >= p_end_time then
    return jsonb_build_object('error', 'Neplatný časový rozsah');
  end if;

  v_duration_minutes := extract(epoch from (p_end_time - p_start_time)) / 60;
  if v_duration_minutes < v_settings.min_duration_minutes then
    return jsonb_build_object('error', 'Minimální délka rezervace je ' || v_settings.min_duration_minutes || ' minut');
  end if;
  if v_duration_minutes > v_settings.max_duration_minutes then
    return jsonb_build_object('error', 'Maximální délka rezervace je ' || v_settings.max_duration_minutes || ' minut');
  end if;

  if extract(minute from p_start_time)::int % v_settings.slot_minutes != 0 then
    return jsonb_build_object('error', 'Čas musí být zarovnaný na ' || v_settings.slot_minutes || ' minut');
  end if;
  if extract(minute from p_end_time)::int % v_settings.slot_minutes != 0 then
    return jsonb_build_object('error', 'Čas musí být zarovnaný na ' || v_settings.slot_minutes || ' minut');
  end if;

  v_advance_days := p_date - current_date;
  if v_advance_days < 0 then
    return jsonb_build_object('error', 'Nelze rezervovat v minulosti');
  end if;
  if v_advance_days >= v_settings.max_advance_days then
    return jsonb_build_object('error', 'Rezervace je možná maximálně ' || v_settings.max_advance_days || ' dny dopředu');
  end if;

  v_slot_time := p_start_time;
  while v_slot_time < p_end_time loop
    select count(*) into v_overlap_count
    from public.reservations
    where date = p_date
      and start_time <= v_slot_time
      and end_time > v_slot_time;

    if v_overlap_count >= v_settings.max_overlap then
      return jsonb_build_object('error', 'Slot ' || v_slot_time::text || ' je plný (max ' || v_settings.max_overlap || ' osob)');
    end if;

    v_slot_time := v_slot_time + (v_settings.slot_minutes || ' minutes')::interval;
  end loop;

  insert into public.reservations (user_id, date, start_time, end_time)
  values (v_user_id, p_date, p_start_time, p_end_time);

  return jsonb_build_object('success', true);
end;
$$;

-- ---- admin_cancel_reservation function ----

create or replace function public.admin_cancel_reservation(
  p_reservation_id uuid
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_admin boolean;
  v_reservation record;
begin
  select (role = 'admin') into v_admin
  from public.profiles where id = auth.uid();

  if not v_admin then
    raise exception 'Pouze admin může rušit cizí rezervace';
  end if;

  select r.*, p.email, p.display_name
  into v_reservation
  from public.reservations r
  join public.profiles p on p.id = r.user_id
  where r.id = p_reservation_id;

  if not found then
    raise exception 'Rezervace nenalezena';
  end if;

  delete from public.reservations where id = p_reservation_id;

  perform net.http_post(
    url := 'https://xyhfactasqgfbtmglgsu.supabase.co/functions/v1/notify-cancellation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5aGZhY3Rhc3FnZmJ0bWdsZ3N1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM3NDMzNiwiZXhwIjoyMDk0OTUwMzM2fQ.JsPJvc0WRmeyc32L0hfITEYGd-AwfX-eiD_h6XMEYMA'
    ),
    body := jsonb_build_object(
      'email', v_reservation.email,
      'display_name', v_reservation.display_name,
      'date', v_reservation.date,
      'start_time', v_reservation.start_time,
      'end_time', v_reservation.end_time
    )
  );
end;
$$;

-- ---- admin_delete_user function ----

create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_admin boolean;
begin
  select (role = 'admin') into v_admin
  from public.profiles where id = auth.uid();

  if not v_admin then
    raise exception 'Pouze admin';
  end if;

  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$$;

-- ---- Enable realtime ----

alter publication supabase_realtime add table public.reservations;

-- URL a service_role_key jsou hardcoded přímo ve funkci admin_cancel_reservation výše.


-- =============================================================
-- ČÁST B — EXPORT DAT ZE STARÉHO SUPABASE
-- =============================================================
-- Spusť tyto dotazy na STARÉM Supabase a výsledky si zkopíruj.

-- 1. Export uživatelů z auth (potřebuješ service_role nebo SQL Editor)
SELECT
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
FROM auth.users;

-- 2. Export profilů
SELECT id, email, display_name, role, active FROM public.profiles;

-- 3. Export budoucích rezervací (minulé nemá smysl přenášet)
SELECT id, user_id, date, start_time, end_time, created_at
FROM public.reservations
WHERE date >= CURRENT_DATE
ORDER BY date, start_time;

-- 4. Export platných pozvánek
SELECT id, token, expires_at, created_by, created_at
FROM public.invite_tokens
WHERE expires_at > NOW();

-- 5. Export nastavení posilovny
SELECT * FROM public.gym_settings WHERE id = 1;


-- =============================================================
-- ČÁST C — IMPORT DAT NA NOVÝ SUPABASE
-- =============================================================
-- POZOR: auth.users musí být naimportovány DŘÍVE než profiles!
-- Nejjednodušší způsob importu auth.users je přes Supabase CLI (viz níže).
-- Pokud použiješ CLI dump, přeskoč sekci auth.users níže.

-- Alternativní ruční import auth.users (pokud nechceš CLI):
-- Uživatelé budou mít neplatná hesla → pošli jim reset password email
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
--   created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
--   is_super_admin, role, aud)
-- VALUES
--   -- SEM VLOŽ DATA Z EXPORTU
-- ;

-- Import profilů (NAHRAĎ hodnotami z exportu):
-- INSERT INTO public.profiles (id, email, display_name, role, active) VALUES
--   ('uuid-1', 'email@example.com', 'Jméno', 'user', true),
--   ('uuid-2', 'admin@example.com', 'Admin', 'admin', true);

-- Import budoucích rezervací:
-- INSERT INTO public.reservations (id, user_id, date, start_time, end_time, created_at) VALUES
--   ('uuid-res-1', 'uuid-user-1', '2026-05-26', '08:00', '09:00', now());

-- Import platných pozvánek (nepovinné):
-- INSERT INTO public.invite_tokens (id, token, expires_at, created_by, created_at) VALUES
--   ('uuid-inv-1', 'uuid-token-1', '2026-06-01 23:59:59+00', 'uuid-admin-1', now());

-- Import nastavení (pokud se liší od výchozích hodnot):
-- UPDATE public.gym_settings SET
--   max_overlap = 3,
--   max_advance_days = 3,
--   opening_hour = 7,
--   opening_minute = 0,
--   closing_hour = 22,
--   closing_minute = 0,
--   slot_minutes = 15,
--   min_duration_minutes = 15,
--   max_duration_minutes = 120
-- WHERE id = 1;

-- Po importu dat nastav admina:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'tvuj@email.cz';


-- =============================================================
-- ČÁST D — CHECKLIST PO MIGRACI
-- =============================================================
-- Toto jsou kroky mimo SQL — proveď ručně:
--
-- 1. GitHub Secrets — aktualizuj v repo Settings > Secrets:
--    VITE_SUPABASE_URL    = nová URL projektu
--    VITE_SUPABASE_ANON_KEY = nový anon key
--
-- 2. Deploy Edge Function na nový Supabase:
--    supabase functions deploy notify-cancellation --project-ref NOVY_PROJECT_REF
--
-- 3. Nastav secret v Edge Functions:
--    supabase secrets set RESEND_API_KEY=tvuj_resend_api_key --project-ref NOVY_PROJECT_REF
--
-- 4. V Supabase Dashboard > Authentication > URL Configuration:
--    Site URL: https://obzi.github.io/gym-reservation-system/
--    Redirect URLs: https://obzi.github.io/gym-reservation-system/
--
-- 5. Povolení pg_net extension (pro email notifikace):
--    CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- 6. Spusť GitHub Actions deploy (push do main nebo ručně)
--
-- 7. Ověř přihlášení, rezervaci, admin panel a email notifikaci
