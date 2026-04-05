-- Gym settings table (singleton row)
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

-- Anyone authenticated can read settings
create policy "Authenticated users can read settings"
  on public.gym_settings for select
  to authenticated
  using (true);

-- Only admins can update settings
create policy "Admins can update settings"
  on public.gym_settings for update
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Insert default row
insert into public.gym_settings (id) values (1);

-- Drop old static constraints on reservations table
alter table public.reservations drop constraint if exists valid_opening_hours;
alter table public.reservations drop constraint if exists valid_duration;
alter table public.reservations drop constraint if exists valid_slot_granularity;

-- Update create_reservation to read from settings
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
begin
  -- Load settings
  select * into v_settings from public.gym_settings where id = 1;

  -- Check user is active
  select active into v_active from public.profiles where id = v_user_id;
  if not v_active then
    return jsonb_build_object('error', 'Váš účet je deaktivován');
  end if;

  -- Validate opening hours
  if p_start_time < make_time(v_settings.opening_hour, 0, 0) then
    return jsonb_build_object('error', 'Rezervace mimo otevírací dobu');
  end if;
  if p_end_time > make_time(v_settings.closing_hour, 0, 0) then
    return jsonb_build_object('error', 'Rezervace mimo otevírací dobu');
  end if;

  -- Validate time range
  if p_start_time >= p_end_time then
    return jsonb_build_object('error', 'Neplatný časový rozsah');
  end if;

  -- Validate duration
  v_duration_minutes := extract(epoch from (p_end_time - p_start_time)) / 60;
  if v_duration_minutes < v_settings.min_duration_minutes then
    return jsonb_build_object('error', 'Minimální délka rezervace je ' || v_settings.min_duration_minutes || ' minut');
  end if;
  if v_duration_minutes > v_settings.max_duration_minutes then
    return jsonb_build_object('error', 'Maximální délka rezervace je ' || v_settings.max_duration_minutes || ' minut');
  end if;

  -- Validate slot granularity
  if extract(minute from p_start_time)::int % v_settings.slot_minutes != 0 then
    return jsonb_build_object('error', 'Čas musí být zarovnaný na ' || v_settings.slot_minutes || ' minut');
  end if;
  if extract(minute from p_end_time)::int % v_settings.slot_minutes != 0 then
    return jsonb_build_object('error', 'Čas musí být zarovnaný na ' || v_settings.slot_minutes || ' minut');
  end if;

  -- Check max advance days
  v_advance_days := p_date - current_date;
  if v_advance_days < 0 then
    return jsonb_build_object('error', 'Nelze rezervovat v minulosti');
  end if;
  if v_advance_days >= v_settings.max_advance_days then
    return jsonb_build_object('error', 'Rezervace je možná maximálně ' || v_settings.max_advance_days || ' dny dopředu');
  end if;

  -- Check overlap for each slot in the range
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

  -- Create reservation
  insert into public.reservations (user_id, date, start_time, end_time)
  values (v_user_id, p_date, p_start_time, p_end_time);

  return jsonb_build_object('success', true);
end;
$$;
