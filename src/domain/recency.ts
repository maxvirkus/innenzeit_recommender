import type { ExerciseId, SessionFeedback } from './types';

/**
 * Width of the "tolerance band" around the top score. Exercises whose score is
 * within TOLERANCE_BAND of the best are treated as practically equivalent and
 * may be rotated so the same practice is not always served.
 *
 * Chosen at 0.5: final scores sit roughly on a 6–10 scale and the recommender
 * already treats a runner-up gap below 0.3 as a "close alternative", so 0.5
 * marks genuine near-ties without ever letting a clearly weaker practice win.
 */
export const TOLERANCE_BAND = 0.5;

/**
 * Builds a recency order (most recent first, one entry per practice) from the
 * feedback history, used as a fallback when no explicit `recentlyServed` list
 * is provided.
 */
function historyOrder(history: SessionFeedback[]): string[] {
  const byRecency = [...history].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );
  const seen = new Set<string>();
  const order: string[] = [];
  for (const fb of byRecency) {
    if (seen.has(fb.practiceId)) continue;
    seen.add(fb.practiceId);
    order.push(fb.practiceId);
  }
  return order;
}

/**
 * Recency penalty for one practice, based on how recently it was served. The
 * most recently served practice gets the largest penalty; it halves with every
 * session since. Capped just under TOLERANCE_BAND so the penalty can reorder
 * practices *within* the band, but can never push an in-band practice below an
 * out-of-band one.
 *
 * `recentlyServed` is newest-first. If it is empty, the feedback `history` is
 * used as the recency signal instead. With neither signal every penalty is 0,
 * so the ranking is identical to no rotation at all.
 */
export function calculateRecencyPenalty(
  id: ExerciseId,
  recentlyServed: string[],
  history: SessionFeedback[],
): number {
  const order =
    recentlyServed.length > 0 ? recentlyServed : historyOrder(history);
  const k = order.indexOf(id);
  if (k < 0) return 0;
  const penalty = TOLERANCE_BAND * 0.9 * Math.pow(0.5, k);
  return Math.min(penalty, TOLERANCE_BAND);
}
