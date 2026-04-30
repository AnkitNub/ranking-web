-- Migration to fix timezone issues by converting columns to TIMESTAMPTZ
ALTER TABLE events 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ,
  ALTER COLUMN started_at TYPE TIMESTAMPTZ,
  ALTER COLUMN turn_start_time TYPE TIMESTAMPTZ,
  ALTER COLUMN expires_at TYPE TIMESTAMPTZ;

-- Also update scores table if needed
ALTER TABLE scores
  ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Also update users table
ALTER TABLE users
  ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Also update participants table
ALTER TABLE participants
  ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Also update guest_judges table
ALTER TABLE guest_judges
  ALTER COLUMN created_at TYPE TIMESTAMPTZ;
