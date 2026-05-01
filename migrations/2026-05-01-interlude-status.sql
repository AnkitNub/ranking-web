-- Adds an 'interlude' status to events. After the last judge for a participant
-- submits a score, the turn engine parks the event in 'interlude' so the
-- presentation can run the breakdown + leaderboard reveal for that participant
-- before the next participant's turn starts. Admin advances out of interlude
-- via POST /api/events/[id]/next-participant.

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE events
  ADD CONSTRAINT events_status_check
  CHECK (status::text = ANY (
    ARRAY[
      'not_started'::varchar,
      'active'::varchar,
      'interlude'::varchar,
      'ended'::varchar
    ]::text[]
  ));
