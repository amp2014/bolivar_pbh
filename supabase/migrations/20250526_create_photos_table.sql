CREATE TABLE photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  r2_key text NOT NULL,
  public_url text NOT NULL,
  filename text,
  file_size integer,
  content_type text DEFAULT 'image/jpeg',
  caption text,
  uploader_id uuid REFERENCES users(id) ON DELETE SET NULL,
  uploader_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX photos_created_at_idx
  ON photos(created_at DESC);
CREATE INDEX photos_uploader_id_idx
  ON photos(uploader_id);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view photos"
  ON photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert photos"
  ON photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own photos or admin any"
  ON photos FOR DELETE
  TO authenticated
  USING (
    uploader_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
