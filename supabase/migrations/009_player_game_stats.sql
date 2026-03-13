-- Per-player, per-game stats (goals, assists, result) for the stats page
CREATE TABLE player_game_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goals INTEGER NOT NULL DEFAULT 0 CHECK (goals >= 0),
  assists INTEGER NOT NULL DEFAULT 0 CHECK (assists >= 0),
  result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

CREATE INDEX idx_player_game_stats_player ON player_game_stats(player_id);
CREATE INDEX idx_player_game_stats_game ON player_game_stats(game_id);

CREATE TRIGGER update_player_game_stats_updated_at
  BEFORE UPDATE ON player_game_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE player_game_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own stats"
  ON player_game_stats FOR SELECT
  USING (
    player_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Organizers can manage stats for their games"
  ON player_game_stats FOR ALL
  USING (
    game_id IN (
      SELECT g.id FROM games g
      JOIN organizers o ON o.id = g.organizer_id
      JOIN profiles p ON p.id = o.profile_id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    game_id IN (
      SELECT g.id FROM games g
      JOIN organizers o ON o.id = g.organizer_id
      JOIN profiles p ON p.id = o.profile_id
      WHERE p.user_id = auth.uid()
    )
  );
