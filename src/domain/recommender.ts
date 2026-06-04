import { EXERCISES } from '../data/exercises';
import { calculateMoodProfile } from './calculateMoodProfile';
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
 * Fallback used when no settings are passed (e.g. in unit tests). Intentionally
 * identical to {@link DEFAULT_USER_SETTINGS} so tests exercise the same
 * conservative safety posture a first-time user actually gets.
 */
const FALLBACK_SETTINGS: UserSettings = DEFAULT_USER_SETTINGS;

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

  // Rank by score, then break ties deterministically: stronger evidence first,
  // then shorter (lower commitment), then stable id order.
  allowed.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.exercise.sciencePrior !== a.exercise.sciencePrior)
      return b.exercise.sciencePrior - a.exercise.sciencePrior;
    if (a.exercise.durationMinutes !== b.exercise.durationMinutes)
      return a.exercise.durationMinutes - b.exercise.durationMinutes;
    return a.exercise.id.localeCompare(b.exercise.id);
  });

  // Pick the highest-scoring practice that is allowed to be primary.
  const primaryIndex = allowed.findIndex((s) =>
    canBePrimary(s.exercise, stateGoal, profile),
  );
  const primary = primaryIndex >= 0 ? allowed[primaryIndex].exercise : null;

  // Alternatives must clear a minimum quality bar, so a clearly unfitting
  // practice (negative score) is never surfaced as a "good alternative".
  const alternatives = allowed
    .filter((_, i) => i !== primaryIndex)
    .filter((s) => s.score > 0)
    .slice(0, 2)
    .map((s) => s.exercise);

  return {
    profile,
    stateGoal,
    primary,
    alternatives,
    excludedExercises: excluded,
    scoredExercises: allowed,
  };
}
