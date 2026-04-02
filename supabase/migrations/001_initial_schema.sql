-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  active boolean not null default true
);

alter table public.profiles enable row level security;

-- Profiles RLS
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

-- Auto-create profile on signup
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

-- Reservations table
create table public.reservations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now() not null,
  constraint valid_time_range check (start_time < end_time),
  constraint valid_opening_hours check (
    start_time >= '07:00' and end_time <= '22:00'
  ),
  constraint valid_duration check (
    extract(epoch from (end_time - start_time)) / 60 >= 15
    and extract(epoch from (end_time - start_time)) / 60 <= 120
  ),
  constraint valid_slot_granularity check (
    extract(minute from start_time)::int % 15 = 0
    and extract(minute from end_time)::int % 15 = 0
  )
);

alter table public.reservations enable row level security;

-- Reservations RLS
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

-- Invite tokens table
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

-- Function to create reservation with overlap check
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
begin
  -- Check user is active
  select active into v_active from public.profiles where id = v_user_id;
  if not v_active then
    return jsonb_build_object('error', 'Váš účet je deaktivován');
  end if;

  -- Check max advance days (3 days including today)
  v_advance_days := p_date - current_date;
  if v_advance_days < 0 then
    return jsonb_build_object('error', 'Nelze rezervovat v minulosti');
  end if;
  if v_advance_days >= 3 then
    return jsonb_build_object('error', 'Rezervace je možná maximálně 3 dny dopředu');
  end if;

  -- Check overlap for each 15-min slot in the range
  v_slot_time := p_start_time;
  while v_slot_time < p_end_time loop
    select count(*) into v_overlap_count
    from public.reservations
    where date = p_date
      and start_time <= v_slot_time
      and end_time > v_slot_time;

    if v_overlap_count >= 3 then
      return jsonb_build_object('error', 'Slot ' || v_slot_time::text || ' je plný (max 3 osoby)');
    end if;

    v_slot_time := v_slot_time + interval '15 minutes';
  end loop;

  -- Create reservation
  insert into public.reservations (user_id, date, start_time, end_time)
  values (v_user_id, p_date, p_start_time, p_end_time);

  return jsonb_build_object('success', true);
end;
$$;

-- Function for admin to cancel reservation and trigger notification
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
  -- Check admin
  select (role = 'admin') into v_admin
  from public.profiles where id = auth.uid();

  if not v_admin then
    raise exception 'Pouze admin může rušit cizí rezervace';
  end if;

  -- Get reservation details before deleting
  select r.*, p.email, p.display_name
  into v_reservation
  from public.reservations r
  join public.profiles p on p.id = r.user_id
  where r.id = p_reservation_id;

  if not found then
    raise exception 'Rezervace nenalezena';
  end if;

  -- Delete reservation
  delete from public.reservations where id = p_reservation_id;

  -- Invoke edge function for email notification
  perform net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-cancellation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
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

-- Function for admin to delete user
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

  -- Delete profile (cascades to reservations)
  delete from public.profiles where id = p_user_id;
  -- Delete from auth.users
  delete from auth.users where id = p_user_id;
end;
$$;

-- Enable realtime for reservations
alter publication supabase_realtime add table public.reservations;
