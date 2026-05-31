import type { Category, MoodId, MoodProfile } from './types';

/**
 * Legacy mood-category classifier. Still used for the debug view and the
 * `category` field. The recommendation pipeline itself works with the
 * derived {@link StateGoal} instead.
 *
 * Heaviness/sadness is checked before the stability branch so that profiles
 * dominated by heaviness aren't swallowed by `acute_regulation`.
 */
export function classifyMoodProfile(
  profile: MoodProfile,
  selectedMoodIds: MoodId[],
): Category {
  if (profile.heaviness >= 1.5 && profile.valence <= -1) {
    return 'heaviness_sadness';
  }

  if (
    selectedMoodIds.includes('stressed') ||
    profile.stress >= 1.2 ||
    profile.stability <= -1.5
  ) {
    return 'acute_regulation';
  }

  if (profile.energy <= -1.2 && profile.stress < 1) {
    return 'gentle_activation';
  }

  if (profile.valence >= 1 && profile.stress <= 0 && profile.heaviness <= 0) {
    return 'positive_integration';
  }

  return 'neutral';
}
