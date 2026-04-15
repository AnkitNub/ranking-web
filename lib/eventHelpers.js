/**
 * Calculate remaining time in current round
 * @param {Date} currentRoundStartTime - When the current round started
 * @param {number} roundDurationSeconds - Duration of round in seconds (default 60)
 * @returns {number} Remaining seconds (0 if expired)
 */
export function getRemainingRoundTime(
  currentRoundStartTime,
  roundDurationSeconds = 60,
) {
  if (!currentRoundStartTime) return 0;

  const startTime = new Date(currentRoundStartTime).getTime();
  const now = new Date().getTime();
  const elapsed = (now - startTime) / 1000; // seconds
  const remaining = roundDurationSeconds - elapsed;

  return Math.max(0, Math.ceil(remaining));
}

/**
 * Format seconds to MM:SS
 * @param {number} seconds - Seconds to format
 * @returns {string} Formatted time (MM:SS)
 */
export function formatSeconds(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if 24 hours have passed since event started
 * @param {Date} startedAt - When event was started
 * @returns {boolean} True if 24 hours have passed
 */
export function hasEventExpired24h(startedAt) {
  if (!startedAt) return false;

  const start = new Date(startedAt).getTime();
  const now = new Date().getTime();
  const elapsed = (now - start) / 1000 / 60 / 60; // hours

  return elapsed >= 24;
}

/**
 * Check if current participant's voting period has ended
 * @param {Date} currentRoundStartTime - When round started
 * @param {number} roundDurationSeconds - Duration of round (default 60)
 * @returns {boolean} True if voting period is over
 */
export function isVotingLocked(
  currentRoundStartTime,
  roundDurationSeconds = 60,
) {
  return (
    getRemainingRoundTime(currentRoundStartTime, roundDurationSeconds) === 0
  );
}
