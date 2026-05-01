-- Run this against your Supabase / Postgres database.
-- Adds the columns the turn engine needs and the indexes that make
-- score writes idempotent.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS participants_order        jsonb   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS current_participant_index integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS turn_token                uuid    DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS scores_unique_judge_per_participant
  ON scores (event_id, participant_id, judge_id)
  WHERE judge_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS scores_unique_guest_per_participant
  ON scores (event_id, participant_id, guest_judge_id)
  WHERE guest_judge_id IS NOT NULL;
