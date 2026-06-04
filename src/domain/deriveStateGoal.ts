import type {
  MoodId,
  MoodProfile,
  StateGoal,
  TimeOfDay,
  UserIntent,
} from './types';

/** Why a particular state goal was chosen — used for transparent UI. */
export interface StateGoalExplanation {
  goal: StateGoal;
  /** 1-based index of the triage rule that fired. */
  ruleIndex: number;
  /** Short German reason a non-technical reader can follow. */
  reason: string;
}

/**
 * Derives the short-term state goal *and* the reason it was chosen.
 *
 * The order of the rules is significant — it is a clinical triage from the most
 * specific emotional need to the most generic. Earlier rules win. This is the
 * single source of truth; {@link deriveStateGoal} just returns the `.goal`.
 *
 * Note: the hard safety filter ({@link isAllowedBySafetyRules}) runs afterwards
 * and is independent of the chosen goal, so routing to a gentle goal here can
 * never make a risky practice slip through.
 */
export function explainStateGoal(
  profile: MoodProfile,
  selectedMoodIds: MoodId[],
  timeOfDay: TimeOfDay,
  _userIntent: UserIntent,
): StateGoalExplanation {
  // 1. Heaviness + sadness → compassionate, supportive practices first.
  //    (Body Scan / Self-Compassion are calming, so this stays safe even when
  //    stability is also low.)
  if (profile.heaviness >= 1.5 && profile.valence <= -1)
    return {
      goal: 'emotional_support',
      ruleIndex: 1,
      reason:
        'Hohe Schwere (≥ 1,5) bei gedrückter Stimmung (≤ -1) → zuerst emotional auffangen.',
    };

  // 2. Acute stress → downregulate.
  if (selectedMoodIds.includes('stressed') || profile.stress >= 1.2)
    return {
      goal: 'stress_reduction',
      ruleIndex: 2,
      reason: selectedMoodIds.includes('stressed')
        ? '„Gestresst“ wurde gewählt → Stress herunterregulieren.'
        : 'Stress ist hoch (≥ 1,2) → Stress herunterregulieren.',
    };

  // 3. Ungrounded → anchor and stabilise.
  if (profile.stability <= -1.5)
    return {
      goal: 'grounding',
      ruleIndex: 3,
      reason: 'Stabilität ist niedrig (≤ -1,5) → erden und stabilisieren.',
    };

  // 4. Low energy without stress → lift gently.
  if (profile.energy <= -1.2 && profile.stress < 1)
    return {
      goal: 'gentle_activation',
      ruleIndex: 4,
      reason:
        'Niedrige Energie (≤ -1,2) ohne nennenswerten Stress → sanft aktivieren.',
    };

  // 5. Explicitly energised → channel into focus.
  if (selectedMoodIds.includes('energized'))
    return {
      goal: 'focus',
      ruleIndex: 5,
      reason: '„Energiegeladen“ wurde gewählt → Energie in Fokus lenken.',
    };

  // 6. Bright and calm → deepen the positive state.
  if (profile.valence >= 1 && profile.stress <= 0 && profile.heaviness <= 0)
    return {
      goal: 'positive_integration',
      ruleIndex: 6,
      reason: 'Gute Stimmung, kein Stress, keine Schwere → Positives vertiefen.',
    };

  // 7. Evening fallback → wind down.
  if (timeOfDay === 'evening')
    return {
      goal: 'evening_regulation',
      ruleIndex: 7,
      reason: 'Keine spezifische Notlage, Tageszeit Abend → zur Ruhe kommen.',
    };

  // 8. Default.
  return {
    goal: 'focus',
    ruleIndex: 8,
    reason: 'Keine andere Regel trifft zu → Standard: Fokus & Klarheit.',
  };
}

/**
 * Derives the short-term state goal for the current session. Thin wrapper over
 * {@link explainStateGoal} so the rules live in exactly one place.
 */
export function deriveStateGoal(
  profile: MoodProfile,
  selectedMoodIds: MoodId[],
  timeOfDay: TimeOfDay,
  userIntent: UserIntent,
): StateGoal {
  return explainStateGoal(profile, selectedMoodIds, timeOfDay, userIntent).goal;
}
