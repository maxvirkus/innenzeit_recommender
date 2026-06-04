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
 * Some practices must not become the *primary* suggestion in certain states,
 * only an alternative.
 */
function canBePrimary(
  exercise: Exercise,
  stateGoal: StateGoal,
  profile: MoodProfile,
): boolean {
  // Coherent breathing: keep it out of the primary slot for acute stress and
  // for activation / emotional support.
  if (exercise.id === 'coherent_breathing') {
    if (stateGoal === 'stress_reduction' && profile.stress >= 0.8) return false;
    if (stateGoal === 'gentle_activation' || stateGoal === 'emotional_support')
      return false;
  }

  // Gratitude must not be the automatic primary for clearly heavy/sad profiles —
  // an emotionally holding practice should lead instead. Gratitude can still be
  // an alternative.
  if (
    exercise.id === 'gratitude_reflection' &&
    profile.valence <= -1 &&
    profile.heaviness >= 1.5
  )
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
      timeOfDay,
    });
    allowed.push({ exercise, score: breakdown.finalScore, breakdown });
  }

  // Rank by score, then break ties deterministically: stronger evidence first,
  // then shorter (lower commitment), then stable id order.
  allowed.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ae = a.breakdown.evidenceFit;
    const be = b.breakdown.evidenceFit;
    if (be !== ae) return be - ae;
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

  // Closeness of the runner-up — surfaced as "ähnlich passend" in the UI.
  const scoreGap =
    allowed.length >= 2 ? allowed[0].score - allowed[1].score : Infinity;
  const hasCloseAlternative =
    allowed.length >= 2 && scoreGap < 0.3 && alternatives.length > 0;

  return {
    profile,
    stateGoal,
    primary,
    alternatives,
    excludedExercises: excluded,
    scoredExercises: allowed,
    scoreGap,
    hasCloseAlternative,
  };
}
