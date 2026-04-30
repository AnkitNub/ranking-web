-- Drop the partial indexes that cause issues with Supabase upsert
DROP INDEX IF EXISTS scores_unique_judge_per_participant;
DROP INDEX IF EXISTS scores_unique_guest_per_participant;

-- Create standard unique indexes. 
-- These will enforce uniqueness for non-null IDs while allowing multiple NULLs.
CREATE UNIQUE INDEX scores_unique_judge_idx ON scores (event_id, participant_id, judge_id);
CREATE UNIQUE INDEX scores_unique_guest_idx ON scores (event_id, participant_id, guest_judge_id);
