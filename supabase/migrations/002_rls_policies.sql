-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Organizers policies
-- Anyone can read organizers (for display names)
CREATE POLICY "Anyone can view organizers"
  ON organizers FOR SELECT
  USING (true);

-- Organizers can update their own record
CREATE POLICY "Organizers can update own record"
  ON organizers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = organizers.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Organizers can insert their own record
CREATE POLICY "Organizers can insert own record"
  ON organizers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = organizers.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Games policies
-- Public games: anyone can read
-- Invite-only games: only if they have a booking or know the invite code (handled in app logic)
CREATE POLICY "Anyone can view public games"
  ON games FOR SELECT
  USING (visibility = 'public');

-- Organizers can view their own games (including invite-only)
CREATE POLICY "Organizers can view own games"
  ON games FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizers
      JOIN profiles ON organizers.profile_id = profiles.id
      WHERE organizers.id = games.organizer_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Players can view games they have bookings for
CREATE POLICY "Players can view games they booked"
  ON games FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN profiles ON bookings.player_id = profiles.id
      WHERE bookings.game_id = games.id
      AND profiles.user_id = auth.uid()
    )
  );

-- Organizers can create their own games
CREATE POLICY "Organizers can create games"
  ON games FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizers
      JOIN profiles ON organizers.profile_id = profiles.id
      WHERE organizers.id = games.organizer_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Organizers can update their own games
CREATE POLICY "Organizers can update own games"
  ON games FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizers
      JOIN profiles ON organizers.profile_id = profiles.id
      WHERE organizers.id = games.organizer_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Organizers can delete their own games
CREATE POLICY "Organizers can delete own games"
  ON games FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organizers
      JOIN profiles ON organizers.profile_id = profiles.id
      WHERE organizers.id = games.organizer_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Bookings policies
-- Players can view their own bookings
CREATE POLICY "Players can view own bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = bookings.player_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Organizers can view bookings for their games
CREATE POLICY "Organizers can view bookings for their games"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games
      JOIN organizers ON games.organizer_id = organizers.id
      JOIN profiles ON organizers.profile_id = profiles.id
      WHERE games.id = bookings.game_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Players can create their own bookings
CREATE POLICY "Players can create own bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = bookings.player_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Players can update their own bookings (e.g., cancel)
CREATE POLICY "Players can update own bookings"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = bookings.player_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Organizers can update bookings for their games (e.g., remove player, mark attendance)
CREATE POLICY "Organizers can update bookings for their games"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM games
      JOIN organizers ON games.organizer_id = organizers.id
      JOIN profiles ON organizers.profile_id = profiles.id
      WHERE games.id = bookings.game_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Payouts policies
-- Organizers can view their own payouts
CREATE POLICY "Organizers can view own payouts"
  ON payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizers
      JOIN profiles ON organizers.profile_id = profiles.id
      WHERE organizers.id = payouts.organizer_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Payouts are created by system/edge functions only (no insert policy for users)

