create table public.health_check (
  id integer primary key default 1,
  checked_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

alter table public.health_check enable row level security;

create policy "anon can read health check"
  on public.health_check for select
  to anon
  using (true);

insert into public.health_check (id) values (1);
