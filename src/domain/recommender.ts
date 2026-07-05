import { EXERCISES } from '../data/exercises.js';
import { calculateMoodProfile } from './calculateMoodProfile.js';
import { describeCaution } from './caution.js';
import { deriveStateGoal } from './deriveStateGoal.js';
import { calculateRecencyPenalty, TOLERANCE_BAND } from './recency.js';
import { isAllowedBySafetyRules } from './safetyRules.js';
import { calculateFinalScore } from './scoring.js';
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
  UserSettings,
} from './types.js';

/** Conservative defaults for a brand-new user in the UI. */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  longTermGoals: [],
  breathworkExperience: 'none',
  meditationExperience: 'none',
  practiceIntensity: 'balanced',
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
  history?: SessionFeedback[];
  /**
   * Practice ids served in recent sessions, newest first. Drives the
   * tolerance-band rotation so near-tied practices take turns instead of always
   * surfacing the same one. Falls back to `history` when omitted/empty.
   */
  recentlyServed?: string[];
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
    history = [],
    recentlyServed = [],
  } = input;

  const profile = calculateMoodProfile(selectedMoodIds);
  const stateGoal = deriveStateGoal(profile, selectedMoodIds, timeOfDay);

  const allowed: ScoredExercise[] = [];
  const excluded: ExcludedExercise[] = [];

  for (const exercise of EXERCISES) {
    const decision = isAllowedBySafetyRules(exercise, {
      profile,
      selectedMoodIds,
      timeOfDay,
      userSettings,
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
  const byRawScore = (a: ScoredExercise, b: ScoredExercise): number => {
    if (b.score !== a.score) return b.score - a.score;
    const ae = a.breakdown.evidenceFit;
    const be = b.breakdown.evidenceFit;
    if (be !== ae) return be - ae;
    if (a.exercise.durationMinutes !== b.exercise.durationMinutes)
      return a.exercise.durationMinutes - b.exercise.durationMinutes;
    return a.exercise.id.localeCompare(b.exercise.id);
  };
  allowed.sort(byRawScore);

  // Runner-up gap is read from the raw scores, before any rotation reorders the
  // near-ties.
  const rawTop = allowed.length > 0 ? allowed[0].score : 0;
  const rawSecond = allowed.length >= 2 ? allowed[1].score : undefined;

  // Tolerance-band rotation: practices within TOLERANCE_BAND of the best are
  // near-ties. A recency penalty (capped at TOLERANCE_BAND) is applied to those
  // only, so the same near-tie practice is not always served. A clearly weaker
  // (out-of-band) practice keeps its full, lower score and can never overtake,
  // because every in-band practice stays >= rawTop - TOLERANCE_BAND even after
  // the penalty. With no recency signal all penalties are 0 → ranking unchanged.
  const effective = new Map<ScoredExercise, number>();
  for (const s of allowed) {
    const inBand = rawTop - s.score <= TOLERANCE_BAND;
    effective.set(
      s,
      inBand
        ? s.score -
            calculateRecencyPenalty(s.exercise.id, recentlyServed, history)
        : s.score,
    );
  }
  allowed.sort((a, b) => {
    const diff = (effective.get(b) ?? b.score) - (effective.get(a) ?? a.score);
    if (diff !== 0) return diff;
    return byRawScore(a, b);
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
    rawSecond !== undefined ? rawTop - rawSecond : Infinity;
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
    caution: primary ? describeCaution(primary) : null,
  };
}
