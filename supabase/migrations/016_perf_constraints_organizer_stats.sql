-- ============================================================
-- Migration 016: Performance indexes, constraints, and
-- server-side organizer stats aggregation
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. Missing performance indexes
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_created_at      ON bookings (created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_game_status     ON bookings (game_id, status);
CREATE INDEX IF NOT EXISTS idx_games_visibility_start   ON games (visibility, start_time);
CREATE INDEX IF NOT EXISTS idx_games_created_at         ON games (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created_at      ON messages (created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_motm_user_id    ON feedback (motm_user_id);

-- ──────────────────────────────────────────────────────────────
-- 2. Constraint: start_time must be before end_time
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'games_start_before_end'
      AND table_name = 'games'
  ) THEN
    ALTER TABLE games ADD CONSTRAINT games_start_before_end
      CHECK (start_time < end_time);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 3. Server-side organizer stats (replaces heavy client-side
--    aggregation across 3 tables + JS map/reduce)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_organizer_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id         UUID;
  v_total_games    INT;
  v_games_month    INT;
  v_total_revenue  NUMERIC;
  v_rating_sum     NUMERIC;
  v_rating_count   INT;
  v_play_again_cnt INT;
  v_venues         JSON;
BEGIN
  -- Resolve organizer ID for current user (bypasses RLS)
  SELECT o.id INTO v_org_id
  FROM organizers o
  JOIN profiles p ON p.id = o.profile_id
  WHERE p.user_id = auth.uid();

  IF v_org_id IS NULL THEN
    RETURN json_build_object(
      'totalGames', 0, 'totalRevenue', 0,
      'organizerRating', 0, 'ratingCount', 0,
      'playAgainPct', 0, 'gamesThisMonth', 0,
      'venues', '[]'::json
    );
  END IF;

  -- Game counts
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE start_time >= date_trunc('month', NOW()))::int
  INTO v_total_games, v_games_month
  FROM games WHERE organizer_id = v_org_id;

  IF v_total_games = 0 THEN
    RETURN json_build_object(
      'totalGames', 0, 'totalRevenue', 0,
      'organizerRating', 0, 'ratingCount', 0,
      'playAgainPct', 0, 'gamesThisMonth', 0,
      'venues', '[]'::json
    );
  END IF;

  -- Revenue from confirmed bookings
  SELECT COALESCE(SUM(b.paid_amount), 0)
  INTO v_total_revenue
  FROM bookings b
  JOIN games g ON g.id = b.game_id
  WHERE g.organizer_id = v_org_id AND b.status = 'confirmed';

  -- Feedback aggregates
  SELECT
    COALESCE(SUM(f.rating), 0),
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE f.play_again)::int
  INTO v_rating_sum, v_rating_count, v_play_again_cnt
  FROM feedback f
  JOIN games g ON g.id = f.game_id
  WHERE g.organizer_id = v_org_id;

  -- Venue breakdown: group games by location, aggregate per-venue
  WITH venue_games AS (
    SELECT location_name, place_id, ARRAY_AGG(id) AS game_ids, COUNT(*)::int AS game_count
    FROM games WHERE organizer_id = v_org_id
    GROUP BY location_name, place_id
  )
  SELECT COALESCE(json_agg(json_build_object(
    'venueName',      vg.location_name,
    'placeId',        vg.place_id,
    'gameCount',      vg.game_count,
    'totalRevenue',   COALESCE((SELECT SUM(paid_amount) FROM bookings WHERE game_id = ANY(vg.game_ids) AND status = 'confirmed'), 0),
    'avgRating',      COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM feedback WHERE game_id = ANY(vg.game_ids)), 0),
    'ratingCount',    COALESCE((SELECT COUNT(*)::int FROM feedback WHERE game_id = ANY(vg.game_ids)), 0),
    'playAgainCount', COALESCE((SELECT COUNT(*) FILTER (WHERE play_again)::int FROM feedback WHERE game_id = ANY(vg.game_ids)), 0)
  ) ORDER BY vg.game_count DESC), '[]'::json)
  INTO v_venues
  FROM venue_games vg;

  RETURN json_build_object(
    'totalGames',      v_total_games,
    'totalRevenue',    v_total_revenue,
    'organizerRating', CASE WHEN v_rating_count > 0
                         THEN ROUND((v_rating_sum / v_rating_count)::numeric, 1)
                         ELSE 0 END,
    'ratingCount',     v_rating_count,
    'playAgainPct',    CASE WHEN v_rating_count > 0
                         THEN ROUND((v_play_again_cnt::numeric / v_rating_count) * 100)::int
                         ELSE 0 END,
    'gamesThisMonth',  v_games_month,
    'venues',          v_venues
  );
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 4. Enable realtime on bookings so the app can subscribe
--    to live booking changes per game
-- ──────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
