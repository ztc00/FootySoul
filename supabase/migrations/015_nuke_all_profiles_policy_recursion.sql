-- ============================================================================
-- Migration 015: ELIMINATE ALL profiles subqueries from every RLS policy
-- ============================================================================
-- Root cause: PostgreSQL evaluates ALL permissive SELECT policies (OR-ing them).
-- Any policy on ANY table that JOINs/subqueries `profiles` triggers profiles
-- RLS evaluation, which can chain back through other tables' policies that also
-- touch profiles, creating infinite recursion.
--
-- Fix: Replace every `JOIN profiles ... WHERE profiles.user_id = auth.uid()`
-- with `public.get_my_profile_id()` (a SECURITY DEFINER function that bypasses
-- RLS entirely). This breaks every possible recursion chain.
-- ============================================================================

-- ═══ Ensure the helper function exists ══════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ═══ GAMES: fix INSERT / UPDATE / DELETE ════════════════════════════════════

DROP POLICY IF EXISTS "Organizers can create games" ON games;
CREATE POLICY "Organizers can create games"
  ON games FOR INSERT
  WITH CHECK (
    organizer_id IN (
      SELECT o.id FROM organizers o
      WHERE o.profile_id = public.get_my_profile_id()
    )
  );

DROP POLICY IF EXISTS "Organizers can update own games" ON games;
CREATE POLICY "Organizers can update own games"
  ON games FOR UPDATE
  USING (
    organizer_id IN (
      SELECT o.id FROM organizers o
      WHERE o.profile_id = public.get_my_profile_id()
    )
  );

DROP POLICY IF EXISTS "Organizers can delete own games" ON games;
CREATE POLICY "Organizers can delete own games"
  ON games FOR DELETE
  USING (
    organizer_id IN (
      SELECT o.id FROM organizers o
      WHERE o.profile_id = public.get_my_profile_id()
    )
  );

-- ═══ BOOKINGS: fix organizer SELECT / UPDATE ════════════════════════════════

DROP POLICY IF EXISTS "Organizers can view bookings for their games" ON bookings;
CREATE POLICY "Organizers can view bookings for their games"
  ON bookings FOR SELECT
  USING (
    public.get_organizer_id_for_game(bookings.game_id) IN (
      SELECT o.id FROM organizers o
      WHERE o.profile_id = public.get_my_profile_id()
    )
  );

DROP POLICY IF EXISTS "Organizers can update bookings for their games" ON bookings;
CREATE POLICY "Organizers can update bookings for their games"
  ON bookings FOR UPDATE
  USING (
    public.get_organizer_id_for_game(bookings.game_id) IN (
      SELECT o.id FROM organizers o
      WHERE o.profile_id = public.get_my_profile_id()
    )
  );

-- ═══ PAYOUTS: fix organizer SELECT ══════════════════════════════════════════

DROP POLICY IF EXISTS "Organizers can view own payouts" ON payouts;
CREATE POLICY "Organizers can view own payouts"
  ON payouts FOR SELECT
  USING (
    organizer_id IN (
      SELECT o.id FROM organizers o
      WHERE o.profile_id = public.get_my_profile_id()
    )
  );

-- ═══ FEEDBACK: fix organizer SELECT ═════════════════════════════════════════

DROP POLICY IF EXISTS "Organizers can read feedback for their games" ON feedback;
CREATE POLICY "Organizers can read feedback for their games"
  ON feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games g
      JOIN organizers o ON o.id = g.organizer_id
      WHERE g.id = feedback.game_id
      AND o.profile_id = public.get_my_profile_id()
    )
  );

-- ═══ FAVORITE_VENUES: fix all three policies ════════════════════════════════

DROP POLICY IF EXISTS "Users can view own favorite venues" ON favorite_venues;
CREATE POLICY "Users can view own favorite venues"
  ON favorite_venues FOR SELECT
  USING (profile_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Users can insert own favorite venues" ON favorite_venues;
CREATE POLICY "Users can insert own favorite venues"
  ON favorite_venues FOR INSERT
  WITH CHECK (profile_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Users can delete own favorite venues" ON favorite_venues;
CREATE POLICY "Users can delete own favorite venues"
  ON favorite_venues FOR DELETE
  USING (profile_id = public.get_my_profile_id());

-- ═══ PLAYER_GAME_STATS: fix both policies ═══════════════════════════════════

DROP POLICY IF EXISTS "Users can read own stats" ON player_game_stats;
CREATE POLICY "Users can read own stats"
  ON player_game_stats FOR SELECT
  USING (player_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Organizers can manage stats for their games" ON player_game_stats;
CREATE POLICY "Organizers can manage stats for their games"
  ON player_game_stats FOR ALL
  USING (
    game_id IN (
      SELECT g.id FROM games g
      JOIN organizers o ON o.id = g.organizer_id
      WHERE o.profile_id = public.get_my_profile_id()
    )
  )
  WITH CHECK (
    game_id IN (
      SELECT g.id FROM games g
      JOIN organizers o ON o.id = g.organizer_id
      WHERE o.profile_id = public.get_my_profile_id()
    )
  );

-- ═══ CLEANUP: fix user_has_booking_for_game to not JOIN profiles ════════════
-- (It's SECURITY DEFINER so it wasn't causing recursion, but clean it up anyway)

CREATE OR REPLACE FUNCTION public.user_has_booking_for_game(p_game_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.game_id = p_game_id
      AND b.player_id = public.get_my_profile_id()
      AND b.status IN ('confirmed', 'waitlisted')
  );
$$;

-- ═══ ensure_my_profile: auto-create profile if missing, never returns null ══

CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  -- Fast path: profile already exists
  SELECT id INTO v_id FROM public.profiles WHERE user_id = v_uid;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- Profile missing — create it (phone NOT NULL, use empty string)
  INSERT INTO public.profiles (user_id, phone, email, role)
  VALUES (
    v_uid,
    '',
    (SELECT email FROM auth.users WHERE id = v_uid),
    'player'
  )
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO v_id;

  -- Race condition: ON CONFLICT hit, fetch existing
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.profiles WHERE user_id = v_uid;
  END IF;

  RETURN v_id;
END;
$$;
