-- Migration: add location_area to local_favorites + seed The Big Store
-- Run once in Supabase SQL editor: https://supabase.com/dashboard/project/lnyjouytofrqupnfojil/sql/new

-- ── STEP 1: Add column (safe, run immediately) ───────────────────────────────

ALTER TABLE local_favorites
  ADD COLUMN IF NOT EXISTS location_area text NOT NULL DEFAULT 'Bolivar';

-- ── STEP 2: VERIFY before running updates ────────────────────────────────────
-- Run this SELECT first to see what you have, then decide which rows need updating:
--
--   SELECT id, name, address, location_area FROM local_favorites ORDER BY name;


-- ── STEP 3: UPDATE existing rows (review and edit as needed) ─────────────────

-- Mark Galveston-island entries
UPDATE local_favorites
SET location_area = 'Galveston'
WHERE location_area = 'Bolivar'
  AND (
    address ILIKE '%galveston%'
    OR name   ILIKE '%galveston%'
  );

-- Mark Crystal Beach entries (Hwy 87 on the peninsula)
UPDATE local_favorites
SET location_area = 'Crystal Beach'
WHERE location_area = 'Bolivar'
  AND (
    address ILIKE '%crystal beach%'
    OR address ILIKE '%hwy 87%'
    OR address ILIKE '%highway 87%'
    OR address ILIKE '% tx-87%'
    OR address ILIKE '% tx 87%'
    OR address ILIKE '%route 87%'
  );

-- Anything else that needs manual correction (run individually as needed):
-- UPDATE local_favorites SET location_area = 'Galveston'     WHERE name = 'Exact Name Here';
-- UPDATE local_favorites SET location_area = 'Crystal Beach' WHERE name = 'Exact Name Here';
-- UPDATE local_favorites SET location_area = 'Other'         WHERE name = 'Exact Name Here';


-- ── STEP 4: Insert The Big Store ─────────────────────────────────────────────

INSERT INTO local_favorites (name, category, location_area, address, phone, website, notes)
VALUES (
  'The Big Store',
  'Shopping',
  'Crystal Beach',
  '2385 Highway 87, Crystal Beach, TX 77650',
  '4096842400',
  'https://thebigstorecrystalbeach.com',
  'General store on the peninsula — Ace Hardware inside. Good for basics, beach supplies, and essentials when you don''t want to drive to Galveston.'
);
