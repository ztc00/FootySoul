-- Add optional image_url to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Storage bucket for game cover images
-- Run this in the Supabase dashboard SQL editor or enable via Storage UI:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('game-images', 'game-images', true)
-- ON CONFLICT (id) DO NOTHING;
--
-- Then add an RLS policy to allow organizers to upload:
-- CREATE POLICY "Organizers can upload game images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'game-images' AND auth.role() = 'authenticated');
--
-- CREATE POLICY "Game images are publicly readable"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'game-images');
