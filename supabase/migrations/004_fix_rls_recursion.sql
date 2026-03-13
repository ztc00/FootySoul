-- Fix infinite recursion between games and bookings RLS policies.
-- Cycle: games SELECT policy -> reads bookings -> bookings policy reads games -> games again.
-- Use SECURITY DEFINER functions so one side bypasses RLS and breaks the cycle.

-- 1) Helper: does the current user have a booking for this game? (used in games SELECT policy)
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
    JOIN public.profiles p ON p.id = b.player_id
    WHERE b.game_id = p_game_id
      AND p.user_id = auth.uid()
  );
$$;

-- 2) Helper: organizer_id for a game (used in bookings policies so they don't SELECT from games)
CREATE OR REPLACE FUNCTION public.get_organizer_id_for_game(p_game_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organizer_id FROM public.games WHERE id = p_game_id LIMIT 1;
$$;

-- 3) Replace games policy that read from bookings (causing recursion)
DROP POLICY IF EXISTS "Players can view games they booked" ON games;
CREATE POLICY "Players can view games they booked"
  ON games FOR SELECT
  USING (public.user_has_booking_for_game(id));

-- 4) Replace bookings policies that read from games (other side of recursion)
DROP POLICY IF EXISTS "Organizers can view bookings for their games" ON bookings;
CREATE POLICY "Organizers can view bookings for their games"
  ON bookings FOR SELECT
  USING (
    public.get_organizer_id_for_game(bookings.game_id) IN (
      SELECT o.id
      FROM public.organizers o
      JOIN public.profiles p ON p.id = o.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Organizers can update bookings for their games" ON bookings;
CREATE POLICY "Organizers can update bookings for their games"
  ON bookings FOR UPDATE
  USING (
    public.get_organizer_id_for_game(bookings.game_id) IN (
      SELECT o.id
      FROM public.organizers o
      JOIN public.profiles p ON p.id = o.profile_id
      WHERE p.user_id = auth.uid()
    )
  );
