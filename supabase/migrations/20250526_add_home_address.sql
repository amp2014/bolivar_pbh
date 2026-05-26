-- Add home_address to user profiles for personalized drive-time estimates
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_address text;

-- Allow users to update their own row (home_address + any other profile fields)
CREATE POLICY IF NOT EXISTS "users_update_own_profile" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
