-- 1) List games that are missing map coordinates (so you know which to fix)
SELECT id, title, location_name, address, latitude, longitude, start_time
FROM games
WHERE latitude IS NULL AND address IS NOT NULL AND trim(address) != ''
ORDER BY start_time DESC;

-- 2) Update ONE game (no ID needed) – picks the first upcoming game and sets a real address.
-- Run this once, then in the app: Map tab → "Add locations for existing games".
UPDATE games
SET
  address = 'Dubai Sports City, Dubai, United Arab Emirates',
  location_name = 'Dubai Sports City'
WHERE id = (
  SELECT id FROM games
  WHERE end_time >= NOW()
  ORDER BY start_time ASC
  LIMIT 1
);

-- 2b) Or update by exact game ID (replace the UUID with one from the SELECT in section 1):
-- UPDATE games
-- SET address = 'Dubai Sports City, Dubai, United Arab Emirates', location_name = 'Dubai Sports City'
-- WHERE id = 'paste-game-id-here';

-- 3) Example: update several games by id (fill in your ids and addresses)
/*
UPDATE games SET address = 'Full address 1', location_name = 'Venue name 1' WHERE id = 'uuid-1';
UPDATE games SET address = 'Full address 2', location_name = 'Venue name 2' WHERE id = 'uuid-2';
*/

-- After running UPDATEs, open the app → Map tab → tap "Add locations for existing games"
-- to geocode the updated addresses and show them on the map.
