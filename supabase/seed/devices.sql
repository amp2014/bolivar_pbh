-- House appliance / device instructions seed
-- Table: house_info (section + label + value + sort_order + sensitive)
-- No separate devices table exists; house_info is the canonical store.
-- Run in Supabase SQL editor.
--
-- On conflict: update existing rows matched by (section, label) if you
-- have a unique constraint on those columns; otherwise this is a plain INSERT.
-- If you need idempotent upsert, add ON CONFLICT (section, label) DO UPDATE
-- after confirming the constraint name.

INSERT INTO house_info (section, label, value, sort_order, sensitive)
VALUES
  ('Devices', 'Breaker Panel',
   'Located near the refrigerator. On arrival: turn ON breakers with yellow tags. On departure: turn OFF all yellow-tagged breakers. The yellow tags identify the house circuit breakers — other breakers should be left alone.',
   10, false),

  ('Devices', 'Main Room AC Unit',
   'Located in the main room / living area. Controlled by the remote with the green cover — usually kept on the kitchen table. Turn on upon arrival, turn off before leaving. The wall lamps are touch-activated (tap to toggle).',
   20, false),

  ('Devices', 'Bedroom AC Units',
   'Each occupied bedroom has its own window AC unit. Turn on only the units for bedrooms in use. Turn all units off before leaving.',
   30, false),

  ('Devices', 'Ice Maker',
   'Located in the kitchen. On arrival: fill with water and turn on. On departure: unplug and drain the water. Do not leave it running while the house is unoccupied.',
   40, false),

  ('Devices', 'Bathroom Exhaust Fan',
   'Located in the bathroom. Turn off before leaving the house — easy to forget. It is included on the departure checklist.',
   50, false);

-- Verify
-- SELECT section, label, sort_order FROM house_info WHERE section = 'Devices' ORDER BY sort_order;
