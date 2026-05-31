import type {
  MoodId,
  MoodProfile,
  StateGoal,
  TimeOfDay,
  UserIntent,
} from './types';

/**
 * Derives the short-term state goal for the current session.
 *
 * The order of the rules is significant: more acute / safety-relevant states
 * (low stability, high stress) take precedence over softer ones.
 */
export function deriveStateGoal(
  profile: MoodProfile,
  selectedMoodIds: MoodId[],
  timeOfDay: TimeOfDay,
  _userIntent: UserIntent,
): StateGoal {
  if (profile.stability <= -1.5) return 'grounding';
  if (selectedMoodIds.includes('stressed') || profile.stress >= 1.2)
    return 'stress_reduction';
  if (profile.heaviness >= 1.5 && profile.valence <= -1)
    return 'emotional_support';
  if (profile.energy <= -1.2 && profile.stress < 1) return 'gentle_activation';
  if (selectedMoodIds.includes('energized')) return 'focus';
  if (profile.valence >= 1 && profile.stress <= 0 && profile.heaviness <= 0)
    return 'positive_integration';
  if (timeOfDay === 'evening') return 'evening_regulation';
  return 'focus';
}
