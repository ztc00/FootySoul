-- Allow a booking to reserve 1–3 spots (e.g. player + friends)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS spots integer NOT NULL DEFAULT 1
    CHECK (spots >= 1 AND spots <= 3);

COMMENT ON COLUMN bookings.spots IS 'Number of slots reserved by this booking (1–3).';
