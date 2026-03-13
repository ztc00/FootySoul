-- Allow listing invite_only games on Discover (show as locked)
CREATE POLICY "Anyone can view games for discover"
  ON games FOR SELECT
  USING (true);
