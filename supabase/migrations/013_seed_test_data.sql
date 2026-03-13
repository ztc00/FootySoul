DO $$
DECLARE
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid();
  u3 uuid := gen_random_uuid(); u4 uuid := gen_random_uuid();
  u5 uuid := gen_random_uuid(); u6 uuid := gen_random_uuid();
  u7 uuid := gen_random_uuid(); u8 uuid := gen_random_uuid();
  p1 uuid; p2 uuid; p3 uuid; p4 uuid;
  p5 uuid; p6 uuid; p7 uuid; p8 uuid;
  org1 uuid;
  g1 uuid; g2 uuid; g3 uuid; g4 uuid; g5 uuid;
BEGIN

  -- ── Auth users (required before profiles) ───────────────────────────────
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES
    (u1,'ahmed@test.footsoul.app', '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (u2,'marco@test.footsoul.app', '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (u3,'james@test.footsoul.app', '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (u4,'khalid@test.footsoul.app','', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (u5,'diego@test.footsoul.app', '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (u6,'yusuf@test.footsoul.app', '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (u7,'ravi@test.footsoul.app',  '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (u8,'luca@test.footsoul.app',  '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  -- ── Profiles ─────────────────────────────────────────────────────────────
  INSERT INTO profiles (user_id, name, phone, email, role, nickname)
  VALUES
    (u1, 'Ahmed Al-Rashid',   '+971501234561', 'ahmed@test.footsoul.app',  'organizer', 'The Gaffer'),
    (u2, 'Marco Rossi',       '+971501234562', 'marco@test.footsoul.app',  'player',    'Il Capitano'),
    (u3, 'James Okafor',      '+971501234563', 'james@test.footsoul.app',  'player',    'JO10'),
    (u4, 'Khalid Hassan',     '+971501234564', 'khalid@test.footsoul.app', 'player',    'KH'),
    (u5, 'Diego Fernandez',   '+971501234565', 'diego@test.footsoul.app',  'player',    'Dieguito'),
    (u6, 'Yusuf Al-Mansoori', '+971501234566', 'yusuf@test.footsoul.app',  'player',    NULL),
    (u7, 'Ravi Sharma',       '+971501234567', 'ravi@test.footsoul.app',   'player',    'RavStar'),
    (u8, 'Luca Bianchi',      '+971501234568', 'luca@test.footsoul.app',   'player',    NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO p1 FROM profiles WHERE email = 'ahmed@test.footsoul.app';
  SELECT id INTO p2 FROM profiles WHERE email = 'marco@test.footsoul.app';
  SELECT id INTO p3 FROM profiles WHERE email = 'james@test.footsoul.app';
  SELECT id INTO p4 FROM profiles WHERE email = 'khalid@test.footsoul.app';
  SELECT id INTO p5 FROM profiles WHERE email = 'diego@test.footsoul.app';
  SELECT id INTO p6 FROM profiles WHERE email = 'yusuf@test.footsoul.app';
  SELECT id INTO p7 FROM profiles WHERE email = 'ravi@test.footsoul.app';
  SELECT id INTO p8 FROM profiles WHERE email = 'luca@test.footsoul.app';

  -- ── Organizer ─────────────────────────────────────────────────────────────
  INSERT INTO organizers (profile_id, display_name)
  VALUES (p1, 'Ahmed FC / Dubai Sunday League')
  ON CONFLICT (profile_id) DO NOTHING;
  SELECT id INTO org1 FROM organizers WHERE profile_id = p1;

  -- ── Games ─────────────────────────────────────────────────────────────────
  INSERT INTO games (organizer_id, title, start_time, end_time,
    location_name, address, latitude, longitude,
    price, currency, capacity, visibility, pitch_type, require_payment_now, rules)
  VALUES (org1, 'Friday Night 5s @ Al Wasl',
    (now() + interval '3 days')::date + time '20:00',
    (now() + interval '3 days')::date + time '21:00',
    'Al Wasl Sports Club', 'Al Wasl Sports Club, Jumeirah, Dubai, UAE',
    25.1894, 55.2379, 50, 'AED', 10, 'public', '5-a-side', true,
    'No slide tackles. Bring your own boots. Water provided.')
  RETURNING id INTO g1;

  INSERT INTO games (organizer_id, title, start_time, end_time,
    location_name, address, latitude, longitude,
    price, currency, capacity, visibility, pitch_type, require_payment_now, rules)
  VALUES (org1, 'Sat Morning 7s — Dubai Sports City',
    (now() + interval '4 days')::date + time '08:00',
    (now() + interval '4 days')::date + time '09:30',
    'Dubai Sports City Academy', 'Dubai Sports City, Sheikh Mohammed bin Zayed Rd, Dubai, UAE',
    25.0477, 55.2228, 40, 'AED', 14, 'public', '7-a-side', false,
    'Arrive 10 minutes early. All levels welcome.')
  RETURNING id INTO g2;

  INSERT INTO games (organizer_id, title, start_time, end_time,
    location_name, address, latitude, longitude,
    price, currency, capacity, visibility, pitch_type, require_payment_now, invite_code, rules)
  VALUES (org1, 'Private 5s — JBR Beach Pitch',
    (now() + interval '10 days')::date + time '18:00',
    (now() + interval '10 days')::date + time '19:00',
    'JBR Open Beach Pitch', 'Jumeirah Beach Residence, Dubai, UAE',
    25.0789, 55.1347, 0, 'AED', 10, 'invite_only', '5-a-side', false, 'XJBR2024',
    'Invitees only. No latecomers after 5 min past start.')
  RETURNING id INTO g3;

  INSERT INTO games (organizer_id, title, start_time, end_time,
    location_name, address, latitude, longitude,
    price, currency, capacity, visibility, pitch_type, require_payment_now, rules)
  VALUES (org1, 'Tuesday Lunchtime Kickabout',
    (now() + interval '1 day')::date + time '13:00',
    (now() + interval '1 day')::date + time '14:00',
    'GEMS World Academy Astro', 'GEMS World Academy, Al Barsha, Dubai, UAE',
    25.1012, 55.1870, 30, 'AED', 10, 'public', '5-a-side', true,
    'Half-time oranges provided 🍊')
  RETURNING id INTO g4;

  INSERT INTO games (organizer_id, title, start_time, end_time,
    location_name, address, latitude, longitude,
    price, currency, capacity, visibility, pitch_type, require_payment_now, rules)
  VALUES (org1, 'Sunday 11s League Match',
    (now() + interval '14 days')::date + time '16:00',
    (now() + interval '14 days')::date + time '17:30',
    'Hamdan Sports Complex', 'Hamdan Sports Complex, Al Nasr, Dubai, UAE',
    25.2262, 55.3044, 60, 'AED', 22, 'public', '11-a-side', true,
    'Full 11-a-side. Team sheets before kick-off.')
  RETURNING id INTO g5;

  -- ── Bookings ──────────────────────────────────────────────────────────────
  INSERT INTO bookings (game_id, player_id, status, paid_amount, spots) VALUES
    (g1, p2, 'confirmed',  50, 1), (g1, p3, 'confirmed', 50, 1),
    (g1, p4, 'confirmed',  50, 1), (g1, p5, 'confirmed', 50, 1),
    (g1, p6, 'confirmed',  50, 1), (g1, p7, 'confirmed', 50, 1),
    (g1, p8, 'confirmed',  50, 1), (g1, p1, 'waitlisted', 0, 1),
    (g2, p2, 'confirmed',   0, 1), (g2, p3, 'confirmed',  0, 1),
    (g2, p5, 'confirmed',   0, 2), (g2, p7, 'confirmed',  0, 1),
    (g4, p2, 'confirmed',  30, 1), (g4, p3, 'confirmed', 30, 1),
    (g4, p4, 'confirmed',  30, 1), (g4, p5, 'confirmed', 30, 1),
    (g4, p6, 'confirmed',  30, 1), (g4, p7, 'confirmed', 30, 1),
    (g4, p8, 'confirmed',  30, 1), (g4, p1, 'confirmed', 30, 2),
    (g5, p2, 'confirmed',  60, 1), (g5, p4, 'confirmed', 60, 1),
    (g5, p6, 'confirmed',  60, 1)
  ON CONFLICT DO NOTHING;

  -- ── Favourite venues ──────────────────────────────────────────────────────
  INSERT INTO favorite_venues (profile_id, location_name, place_id) VALUES
    (p2, 'Al Wasl Sports Club',       'poi.alwasl001'),
    (p2, 'Dubai Sports City Academy', 'poi.dsc001'),
    (p3, 'Dubai Sports City Academy', 'poi.dsc001'),
    (p4, 'Al Wasl Sports Club',       'poi.alwasl001'),
    (p5, 'Hamdan Sports Complex',     'poi.hamdan001')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seeded: 8 users, 5 games, 23 bookings.';
END $$;
