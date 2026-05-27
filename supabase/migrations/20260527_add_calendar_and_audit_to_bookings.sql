-- Add Google Calendar sync column, original booker name, and updated_at to bookings.
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/lnyjouytofrqupnfojil/sql/new

-- google_calendar_event_id: stores the Google Calendar event ID so we can update/delete it
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS google_calendar_event_id text;

-- booked_by_name: display name of whoever created the booking (preserved on edit)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booked_by_name text;

-- created_at: when the booking record was created (may already exist)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- updated_at: auto-updated on every row change via trigger below
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Trigger function to keep updated_at current
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_set_updated_at ON bookings;
CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Verify
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'bookings' ORDER BY ordinal_position;
