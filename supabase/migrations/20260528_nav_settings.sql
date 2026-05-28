-- nav_settings: single-row table for admin-configurable mobile bottom bar pins
create table if not exists nav_settings (
  id           uuid primary key default gen_random_uuid(),
  pinned_items jsonb not null default '["stays","fishing","local"]',
  updated_by   uuid references users(id),
  updated_at   timestamptz default now()
);

-- Seed exactly one row
insert into nav_settings (pinned_items)
values ('["stays","fishing","local"]');

-- RLS
alter table nav_settings enable row level security;

-- All authenticated users can SELECT
create policy "nav_settings_select" on nav_settings
  for select to authenticated using (true);

-- Only admin role can UPDATE
create policy "nav_settings_update" on nav_settings
  for update to authenticated
  using  ((select role from users where id = auth.uid()) = 'admin')
  with check ((select role from users where id = auth.uid()) = 'admin');
