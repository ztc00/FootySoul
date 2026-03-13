-- Optional fields for premium UI (nullable for existing rows)
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS pitch_type TEXT CHECK (pitch_type IN ('5-a-side', '7-a-side', '11-a-side')),
  ADD COLUMN IF NOT EXISTS require_payment_now BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS place_id TEXT;

-- Profiles: nickname for roster display
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname TEXT;
