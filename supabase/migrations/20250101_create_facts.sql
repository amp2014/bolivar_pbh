-- Facts table for fun facts ticker and rotating card
CREATE TABLE IF NOT EXISTS facts (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  area        text        NOT NULL,
  title       text,
  short_fact  text        NOT NULL,
  long_fact   text,
  category    text,
  source      text,
  active      boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE facts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active facts
CREATE POLICY "authenticated_read_active_facts" ON facts
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND active = true);

-- Admins can manage all facts (checks users.role)
CREATE POLICY "admins_manage_facts" ON facts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
