-- Seed: random users, profiles, organizers, and games (Dubai pickup)
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query, paste, Run).
-- Test login: any seeded email below with password "Password1"
-- If step 1 fails (auth schema differs), create 6 users in Dashboard → Authentication → Users
-- with emails below, set password to Password1, then copy their UUIDs into the profiles INSERT.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Auth users (Supabase auth.users)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'a0000001-0001-4000-8000-000000000001', 'authenticated', 'authenticated', 'alex@footydubai.com', crypt('Password1', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000001-0001-4000-8000-000000000002', 'authenticated', 'authenticated', 'sarah@footydubai.com', crypt('Password1', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000001-0001-4000-8000-000000000003', 'authenticated', 'authenticated', 'omar@footydubai.com', crypt('Password1', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000001-0001-4000-8000-000000000004', 'authenticated', 'authenticated', 'lina@footydubai.com', crypt('Password1', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000001-0001-4000-8000-000000000005', 'authenticated', 'authenticated', 'marcus@footydubai.com', crypt('Password1', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000001-0001-4000-8000-000000000006', 'authenticated', 'authenticated', 'youssef@footydubai.com', crypt('Password1', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2) Profiles (player + 2 organizers)
INSERT INTO public.profiles (id, user_id, name, phone, email, role, nickname)
VALUES
  ('b0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001', 'Alex Chen', '+971501234567', 'alex@footydubai.com', 'organizer', 'Alex'),
  ('b0000001-0001-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000002', 'Sarah Ahmed', '+971502345678', 'sarah@footydubai.com', 'player', 'Sarah'),
  ('b0000001-0001-4000-8000-000000000003', 'a0000001-0001-4000-8000-000000000003', 'Omar Hassan', '+971503456789', 'omar@footydubai.com', 'organizer', 'Omar'),
  ('b0000001-0001-4000-8000-000000000004', 'a0000001-0001-4000-8000-000000000004', 'Lina Khalid', '+971504567890', 'lina@footydubai.com', 'player', 'Lina'),
  ('b0000001-0001-4000-8000-000000000005', 'a0000001-0001-4000-8000-000000000005', 'Marcus Lee', '+971505678901', 'marcus@footydubai.com', 'player', 'Marcus'),
  ('b0000001-0001-4000-8000-000000000006', 'a0000001-0001-4000-8000-000000000006', 'Youssef Ali', '+971506789012', 'youssef@footydubai.com', 'player', 'Youssef')
ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, email = EXCLUDED.email, role = EXCLUDED.role, nickname = EXCLUDED.nickname;

-- 3) Organizers (Alex and Omar)
INSERT INTO public.organizers (id, profile_id, display_name)
VALUES
  ('c0000001-0001-4000-8000-000000000001', 'b0000001-0001-4000-8000-000000000001', 'Alex Chen'),
  ('c0000001-0001-4000-8000-000000000002', 'b0000001-0001-4000-8000-000000000003', 'Omar Hassan')
ON CONFLICT (profile_id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- 4) Games (Dubai locations, mix of pitch types and visibility)
INSERT INTO public.games (
  organizer_id, title, start_time, end_time, location_name, address,
  price, currency, capacity, rules, visibility, invite_code, pitch_type, require_payment_now
)
VALUES
  ('c0000001-0001-4000-8000-000000000001', 'Friday Night 5s – JLT', now() + interval '2 days', now() + interval '2 days' + interval '2 hours', 'JLT Pavilion', 'Jumeirah Lake Towers, Dubai', 40, 'AED', 10, 'Bring boots, no slide tackles.', 'public', null, '5-a-side', true),
  ('c0000001-0001-4000-8000-000000000001', 'Sunday 7-a-side – Sports City', now() + interval '4 days', now() + interval '4 days' + interval '2 hours', 'Dubai Sports City', 'Dubai Sports City, Dubai', 50, 'AED', 14, null, 'public', null, '7-a-side', true),
  ('c0000001-0001-4000-8000-000000000001', 'Midweek 5s – Al Quoz', now() + interval '1 day', now() + interval '1 day' + interval '1 hour 30 minutes', 'Al Quoz Indoor', 'Al Quoz Industrial, Dubai', 35, 'AED', 10, 'Mixed level welcome.', 'public', null, '5-a-side', false),
  ('c0000001-0001-4000-8000-000000000002', 'Saturday 11-a-side – Nad Al Sheba', now() + interval '5 days', now() + interval '5 days' + interval '2 hours', 'Nad Al Sheba Sports Complex', 'Nad Al Sheba, Dubai', 25, 'AED', 22, 'Full pitch, ref provided.', 'public', null, '11-a-side', true),
  ('c0000001-0001-4000-8000-000000000002', 'Private 7s – Invite Only', now() + interval '3 days', now() + interval '3 days' + interval '2 hours', 'The Sevens', 'Al Ain Road, Dubai', 60, 'AED', 14, 'Invite only game.', 'invite_only', 'PRIVATE7', '7-a-side', true),
  ('c0000001-0001-4000-8000-000000000002', 'Evening 5s – Barsha', now() + interval '6 days', now() + interval '6 days' + interval '1 hour 30 minutes', 'Barsha Heights Pitch', 'Barsha Heights, Dubai', 30, 'AED', 10, null, 'public', null, '5-a-side', false),
  ('c0000001-0001-4000-8000-000000000001', 'Tonight 5s – Marina', now() + interval '6 hours', now() + interval '8 hours', 'Marina Walk Pitch', 'Dubai Marina, Dubai', 45, 'AED', 10, 'Casual game.', 'public', null, '5-a-side', true)
ON CONFLICT DO NOTHING;

-- 5) Optional: a few bookings (run after games exist)
INSERT INTO public.bookings (game_id, player_id, status, paid_amount)
SELECT g.id, p.id, 'confirmed', g.price
FROM public.games g
JOIN public.profiles p ON p.user_id IN ('a0000001-0001-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000004')
WHERE g.title = 'Friday Night 5s – JLT'
  AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.game_id = g.id AND b.player_id = p.id);
