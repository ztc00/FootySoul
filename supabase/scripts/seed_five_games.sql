-- Creates 5 games with different Dubai/UAE addresses.
-- You must have at least one organizer (sign up in the app and "Become an Organizer" if needed).
-- Run in Supabase SQL Editor, then in the app: Map tab → "Add locations for existing games".

INSERT INTO games (organizer_id, title, start_time, end_time, location_name, address, price, currency, capacity, visibility, pitch_type, require_payment_now)
SELECT id, 'Friday Kickabout – Sports City', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '2 hours', 'Dubai Sports City', 'Dubai Sports City, Dubai, United Arab Emirates', 50, 'AED', 10, 'public', '5-a-side', true
FROM organizers LIMIT 1;

INSERT INTO games (organizer_id, title, start_time, end_time, location_name, address, price, currency, capacity, visibility, pitch_type, require_payment_now)
SELECT id, 'Evening 5-a-side – Marina', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '2 hours', 'Dubai Marina', 'Dubai Marina, Dubai, United Arab Emirates', 50, 'AED', 10, 'public', '5-a-side', true
FROM organizers LIMIT 1;

INSERT INTO games (organizer_id, title, start_time, end_time, location_name, address, price, currency, capacity, visibility, pitch_type, require_payment_now)
SELECT id, 'Weekend League – JBR', NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days' + INTERVAL '2 hours', 'JBR The Beach', 'Jumeirah Beach Residence, Dubai, United Arab Emirates', 50, 'AED', 10, 'public', '5-a-side', true
FROM organizers LIMIT 1;

INSERT INTO games (organizer_id, title, start_time, end_time, location_name, address, price, currency, capacity, visibility, pitch_type, require_payment_now)
SELECT id, 'Midweek Match – Al Quoz', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '2 hours', 'Al Quoz Sports', 'Al Quoz Industrial Area 1, Dubai, United Arab Emirates', 50, 'AED', 10, 'public', '5-a-side', true
FROM organizers LIMIT 1;

INSERT INTO games (organizer_id, title, start_time, end_time, location_name, address, price, currency, capacity, visibility, pitch_type, require_payment_now)
SELECT id, 'Sunday Session – JLT', NOW() + INTERVAL '12 days', NOW() + INTERVAL '12 days' + INTERVAL '2 hours', 'JLT Park', 'Jumeirah Lake Towers, Dubai, United Arab Emirates', 50, 'AED', 10, 'public', '5-a-side', true
FROM organizers LIMIT 1;
