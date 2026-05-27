-- Migration: create devices and guest_feature_flags tables
-- Run once in Supabase SQL editor: https://supabase.com/dashboard/project/lnyjouytofrqupnfojil/sql/new
-- After running DDL, seed data is inserted via scripts/seed-devices-and-flags.js

-- ── TABLE 1: devices ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS devices (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text NOT NULL,
  type          text,
  location      text,
  instructions  text,
  manual_url    text,
  guest_visible boolean DEFAULT true,
  sort_order    integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view devices"
  ON devices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage devices"
  ON devices FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── TABLE 2: guest_feature_flags ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS guest_feature_flags (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name     text NOT NULL UNIQUE,
  label            text NOT NULL,
  visible_to_guest boolean DEFAULT false,
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE guest_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view flags"
  ON guest_feature_flags FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin can manage flags"
  ON guest_feature_flags FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── Verify ───────────────────────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name IN ('devices','guest_feature_flags');
