-- Fix "infinite recursion detected in policy for relation profiles".
--
-- Root cause: games SELECT policies ("Organizers can view own games",
-- "Anyone can view public games", "Players can view games they booked")
-- all remained active alongside migration 007's USING(true) policy.
-- PostgreSQL evaluates ALL permissive policies (OR-ing them), so the
-- organizers→profiles subqueries in those policies fire on every row,
-- causing profiles RLS to recurse through bookings/games chains.
--
-- Fix A: drop the three game SELECT policies that are now redundant —
-- "Anyone can view games for discover" (USING true) already makes
-- every game visible, so the others add no value but trigger subqueries.
--
-- Fix B: replace bookings policies that subquery profiles with a
-- SECURITY DEFINER helper, breaking the recursion there too.

-- ── A. Security-definer helper: profile id for current user ─────────────────
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ── B. Drop redundant games SELECT policies ──────────────────────────────────
-- (superseded by "Anyone can view games for discover" USING(true) from 007)
DROP POLICY IF EXISTS "Anyone can view public games"      ON games;
DROP POLICY IF EXISTS "Organizers can view own games"     ON games;
DROP POLICY IF EXISTS "Players can view games they booked" ON games;

-- ── C. Rewrite bookings SELECT/INSERT/UPDATE to avoid profiles subquery ──────
DROP POLICY IF EXISTS "Players can view own bookings"   ON bookings;
CREATE POLICY "Players can view own bookings"
  ON bookings FOR SELECT
  USING (player_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Players can create own bookings" ON bookings;
CREATE POLICY "Players can create own bookings"
  ON bookings FOR INSERT
  WITH CHECK (player_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Players can update own bookings" ON bookings;
CREATE POLICY "Players can update own bookings"
  ON bookings FOR UPDATE
  USING (player_id = public.get_my_profile_id());

-- ── D. Also fix organizers policies that subquery profiles ───────────────────
DROP POLICY IF EXISTS "Organizers can update own record" ON organizers;
CREATE POLICY "Organizers can update own record"
  ON organizers FOR UPDATE
  USING (profile_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Organizers can insert own record" ON organizers;
CREATE POLICY "Organizers can insert own record"
  ON organizers FOR INSERT
  WITH CHECK (profile_id = public.get_my_profile_id());
