-- ── Fishing feature schema ────────────────────────────────────────────────

-- fishing_spots: named, geotagged locations
create table if not exists fishing_spots (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  lat        double precision not null,
  lng        double precision not null,
  spot_type  text,                         -- surf|jetty|pier|wade|boat|other
  notes      text,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- fishing_catches: individual catch records with snapshotted conditions
create table if not exists fishing_catches (
  id                   uuid primary key default gen_random_uuid(),
  photo_url            text,
  r2_key               text,
  lat                  double precision,
  lng                  double precision,
  location_source      text,               -- gps|exif|manual|none
  spot_id              uuid references fishing_spots(id),
  species              text,
  length_in            numeric,
  weight_lb            numeric,
  bait                 text,
  notes                text,
  caption              text,
  -- conditions snapshot (captured at moment of catch, never recomputed)
  tide_state           text,               -- rising|falling|high|low
  tide_height_ft       numeric,
  water_temp_f         numeric,
  air_temp_f           numeric,
  wind_mph             numeric,
  wind_dir             text,
  conditions_fetched_ok boolean default false,
  -- display / sharing
  hide_metadata        boolean default false,
  shared_to_feed       boolean default false,
  caught_at            timestamptz,
  caught_by            uuid references users(id),
  created_at           timestamptz default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table fishing_spots enable row level security;
alter table fishing_catches enable row level security;

-- fishing_spots policies
create policy "fishing_spots_select" on fishing_spots
  for select to authenticated using (true);

create policy "fishing_spots_insert" on fishing_spots
  for insert to authenticated
  with check ((select role from users where id = auth.uid()) in ('family', 'admin'));

create policy "fishing_spots_update" on fishing_spots
  for update to authenticated
  using (
    created_by = auth.uid()
    or (select role from users where id = auth.uid()) = 'admin'
  );

create policy "fishing_spots_delete" on fishing_spots
  for delete to authenticated
  using (
    created_by = auth.uid()
    or (select role from users where id = auth.uid()) = 'admin'
  );

-- fishing_catches policies
create policy "fishing_catches_select" on fishing_catches
  for select to authenticated using (true);

create policy "fishing_catches_insert" on fishing_catches
  for insert to authenticated
  with check ((select role from users where id = auth.uid()) in ('family', 'admin'));

create policy "fishing_catches_update" on fishing_catches
  for update to authenticated
  using (
    caught_by = auth.uid()
    or (select role from users where id = auth.uid()) = 'admin'
  );

create policy "fishing_catches_delete" on fishing_catches
  for delete to authenticated
  using (
    caught_by = auth.uid()
    or (select role from users where id = auth.uid()) = 'admin'
  );
