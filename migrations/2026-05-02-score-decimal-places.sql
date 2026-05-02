-- Migration: add score_decimal_places to events table
-- 0 = no decimals (integers only, e.g. 7)
-- 1 = 1 decimal place (e.g. 7.5)
-- 2 = 2 decimal places (e.g. 7.25)

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS score_decimal_places integer NOT NULL DEFAULT 0
    CHECK (score_decimal_places IN (0, 1, 2));

-- Change scores.score from integer to numeric to support decimal scores
ALTER TABLE public.scores
  ALTER COLUMN score TYPE numeric(10, 2) USING score::numeric(10, 2);
