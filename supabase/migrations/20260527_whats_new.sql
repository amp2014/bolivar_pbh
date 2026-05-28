-- Migration: add whats_new versioned alert system
-- Run once in Supabase SQL editor: https://supabase.com/dashboard/project/lnyjouytofrqupnfojil/sql/new

-- 1. Add version tracking column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS whats_new_version integer DEFAULT 0;

-- 2. Create single-row versioned content table
CREATE TABLE IF NOT EXISTS whats_new (
  id          integer PRIMARY KEY DEFAULT 1,
  version     integer     NOT NULL DEFAULT 1,
  title       text        NOT NULL DEFAULT 'What''s New',
  content     text        NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. Seed initial content (edit in Admin → Settings before publishing v2+)
INSERT INTO whats_new (id, version, title, content)
VALUES (
  1, 1,
  'Welcome to the Beach House App',
  E'Your family hub for 604 Nelson Ave is ready.\n\n• Book and track family stays on the Stays page\n• Browse local restaurants, fishing spots, and day trips in Local\n• Check wifi, supplies, and appliance manuals in House\n• Upload and browse beach house photos in Photos\n• View emergency contacts and live ferry wait times any time'
)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS: authenticated users can read; only admins can update
ALTER TABLE whats_new ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whats_new_select" ON whats_new
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "whats_new_update" ON whats_new
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
