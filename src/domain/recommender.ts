import { EXERCISES } from '../data/exercises';
import { calculateMoodProfile } from './calculateMoodProfile';
import { classifyMoodProfile } from './classifyMoodProfile';
import { deriveStateGoal } from './deriveStateGoal';
import { isAllowedBySafetyRules } from './safetyRules';
import { calculateFinalScore } from './scoring';
import type {
  Exercise,
  ExcludedExercise,
  MoodId,
  MoodProfile,
  RecommendationResult,
  ScoredExercise,
  SessionFeedback,
  StateGoal,
  TimeOfDay,
  UserIntent,
  UserSettings,
} from './types';

/** Conservative defaults for a brand-new user in the UI. */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  longTermGoals: [],
  breathworkExperience: 'none',
  meditationExperience: 'none',
  allowDeepPractice: false,
  allowCombinedSessions: false,
};

/**
 * Fallback used when no settings are passed (e.g. in unit tests). Slightly
 * more permissive than the UI default so the scoring engine can be exercised
 * without first configuring experience levels.
 */
const FALLBACK_SETTINGS: UserSettings = {
  longTermGoals: [],
  breathworkExperience: 'some',
  meditationExperience: 'some',
  allowDeepPractice: false,
  allowCombinedSessions: false,
};

export interface RecommenderInput {
  selectedMoodIds: MoodId[];
  timeOfDay: TimeOfDay;
  userSettings?: UserSettings;
  userIntent?: UserIntent;
  history?: SessionFeedback[];
}

/**
 * Coherent breathing has special placement rules: it must not become the
 * primary suggestion in certain state goals, only an alternative.
 */
function canBePrimary(
  exercise: Exercise,
  stateGoal: StateGoal,
  profile: MoodProfile,
): boolean {
  if (exercise.id !== 'coherent_breathing') return true;

  // Only an alternative for stress reduction, unless stress is clearly low.
  if (stateGoal === 'stress_reduction' && profile.stress >= 0.8) return false;

  // Never the main suggestion for gentle activation or emotional support.
  if (stateGoal === 'gentle_activation' || stateGoal === 'emotional_support')
    return false;

  return true;
}

export function recommendExercises(
  input: RecommenderInput,
): RecommendationResult {
  const {
    selectedMoodIds,
    timeOfDay,
    userSettings = FALLBACK_SETTINGS,
    userIntent = 'auto',
    history = [],
  } = input;

  const profile = calculateMoodProfile(selectedMoodIds);
  const category = classifyMoodProfile(profile, selectedMoodIds);
  const stateGoal = deriveStateGoal(
    profile,
    selectedMoodIds,
    timeOfDay,
    userIntent,
  );

  const allowed: ScoredExercise[] = [];
  const excluded: ExcludedExercise[] = [];

  for (const exercise of EXERCISES) {
    const decision = isAllowedBySafetyRules(exercise, {
      profile,
      selectedMoodIds,
      category,
      timeOfDay,
      userSettings,
      userIntent,
    });
    if (!decision.allowed) {
      excluded.push({ exercise, reason: decision.reason ?? 'ausgeschlossen' });
      continue;
    }
    const breakdown = calculateFinalScore({
      practice: exercise,
      stateGoal,
      profile,
      userSettings,
      history,
    });
    allowed.push({ exercise, score: breakdown.finalScore, breakdown });
  }

  allowed.sort((a, b) => b.score - a.score);

  // Pick the highest-scoring practice that is allowed to be primary.
  const primaryIndex = allowed.findIndex((s) =>
    canBePrimary(s.exercise, stateGoal, profile),
  );
  const primary = primaryIndex >= 0 ? allowed[primaryIndex].exercise : null;

  const alternatives = allowed
    .filter((_, i) => i !== primaryIndex)
    .slice(0, 2)
    .map((s) => s.exercise);

  return {
    profile,
    category,
    stateGoal,
    primary,
    alternatives,
    excludedExercises: excluded,
    scoredExercises: allowed,
  };
}
