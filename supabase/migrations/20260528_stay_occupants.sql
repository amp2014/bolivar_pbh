-- Stay occupants: tag existing app users onto a booking
-- "On a stay" = booker (bookings.booked_by) UNION stay_occupants.user_id

create table if not exists stay_occupants (
  id        uuid primary key default gen_random_uuid(),
  stay_id   uuid references bookings(id) on delete cascade not null,
  user_id   uuid references users(id) not null,
  added_by  uuid references users(id) not null,
  added_at  timestamptz default now(),
  unique(stay_id, user_id)
);

alter table stay_occupants enable row level security;

-- SELECT: the booker of the stay, any tagged occupant on the stay, or an admin
create policy "stay_occupants_select" on stay_occupants
  for select using (
    auth.uid() in (
      select booked_by from bookings where id = stay_id
    )
    or auth.uid() in (
      select user_id from stay_occupants so2 where so2.stay_id = stay_occupants.stay_id
    )
    or exists (select 1 from users where id = auth.uid() and role = 'admin')
  );

-- INSERT: only the booker or an admin may tag people
create policy "stay_occupants_insert" on stay_occupants
  for insert with check (
    auth.uid() in (
      select booked_by from bookings where id = stay_id
    )
    or exists (select 1 from users where id = auth.uid() and role = 'admin')
  );

-- DELETE: only the booker or an admin may remove tagged people
create policy "stay_occupants_delete" on stay_occupants
  for delete using (
    auth.uid() in (
      select booked_by from bookings where id = stay_id
    )
    or exists (select 1 from users where id = auth.uid() and role = 'admin')
  );
