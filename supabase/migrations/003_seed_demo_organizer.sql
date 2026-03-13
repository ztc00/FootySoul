-- This migration seeds a demo organizer for development
-- In production, organizers are created through the app flow

-- Note: This requires a user to exist in auth.users first
-- You'll need to create a user via Supabase Auth, then run:
-- INSERT INTO profiles (user_id, name, phone, email, role) 
-- VALUES ('<user_id>', 'Demo Organizer', '+971501234567', 'demo@footydubai.com', 'organizer');
-- 
-- Then get the profile_id and run:
-- INSERT INTO organizers (profile_id, display_name)
-- VALUES ('<profile_id>', 'Demo Organizer');

-- For automated seeding, you can use a function that creates a test user
-- This is for development only

