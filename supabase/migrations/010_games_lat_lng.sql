-- Add optional coordinates to games for map display
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

COMMENT ON COLUMN games.latitude IS 'Venue latitude for map pin';
COMMENT ON COLUMN games.longitude IS 'Venue longitude for map pin';
