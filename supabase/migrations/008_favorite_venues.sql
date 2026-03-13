-- Favorite venues per profile (for filter "Favorites")
CREATE TABLE favorite_venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  place_id TEXT,
  location_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_fav_venue_profile_place ON favorite_venues(profile_id, place_id) WHERE place_id IS NOT NULL;
CREATE UNIQUE INDEX idx_fav_venue_profile_name ON favorite_venues(profile_id, location_name) WHERE place_id IS NULL;

CREATE INDEX idx_favorite_venues_profile ON favorite_venues(profile_id);

ALTER TABLE favorite_venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorite venues"
  ON favorite_venues FOR SELECT
  USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own favorite venues"
  ON favorite_venues FOR INSERT
  WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own favorite venues"
  ON favorite_venues FOR DELETE
  USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
