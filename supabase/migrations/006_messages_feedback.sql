-- Per-game chat
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_game ON messages(game_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read messages for a game"
  ON messages FOR SELECT USING (true);
CREATE POLICY "Authenticated can send"
  ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Post-game feedback
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  play_again BOOLEAN NOT NULL,
  tags TEXT[] DEFAULT '{}',
  comment TEXT,
  motm_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_feedback_game ON feedback(game_id);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own feedback"
  ON feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own feedback"
  ON feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Organizers can read feedback for their games"
  ON feedback FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games g
      JOIN organizers o ON o.id = g.organizer_id
      JOIN profiles p ON p.id = o.profile_id
      WHERE g.id = feedback.game_id AND p.user_id = auth.uid()
    )
  );
