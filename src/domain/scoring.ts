import type {
  Exercise,
  MoodProfile,
  ScoreBreakdown,
  SessionFeedback,
  StateGoal,
  UserSettings,
} from './types';

/**
 * Short-term fit: does the practice serve the current state goal?
 * Strong positive when it matches, mild penalty when it does not.
 */
export function calculateStateFit(
  practice: Exercise,
  stateGoal: StateGoal,
): number {
  return practice.stateGoals.includes(stateGoal) ? 5 : -2;
}

/**
 * Long-term fit: overlap between the practice's long-term goals and the
 * user's chosen onboarding goals. +2 per match, capped at +4.
 */
export function calculateLongTermGoalFit(
  practice: Exercise,
  userSettings: UserSettings,
): number {
  let fit = 0;
  for (const goal of userSettings.longTermGoals) {
    if (practice.longTermGoals.includes(goal)) fit += 2;
  }
  return Math.min(fit, 4);
}

/** Feedback entries that are relevant for a given practice + state goal. */
function relevantHistory(
  practiceId: string,
  stateGoal: StateGoal,
  history: SessionFeedback[],
): SessionFeedback[] {
  return history.filter(
    (h) => h.practiceId === practiceId && h.stateGoal === stateGoal,
  );
}

/**
 * Personal evidence: how this user rated the practice in comparable
 * situations. Needs at least 3 relevant entries, otherwise neutral (0).
 */
export function calculatePersonalEvidenceScore(
  practice: Exercise,
  stateGoal: StateGoal,
  history: SessionFeedback[],
): number {
  const relevant = relevantHistory(practice.id, stateGoal, history);
  if (relevant.length < 3) return 0;

  const n = relevant.length;
  const avgRating = relevant.reduce((s, h) => s + h.rating, 0) / n;

  // Center rating around 3 (neutral) → roughly -2..+2.
  return avgRating - 3;
}

export interface FinalScoreInput {
  practice: Exercise;
  stateGoal: StateGoal;
  profile: MoodProfile;
  userSettings: UserSettings;
  history: SessionFeedback[];
}

/**
 * Combines all signals into a single score plus a transparent breakdown.
 * Weights shift towards the acute state fit when stress is high or stability
 * is low, and towards long-term/personal signals otherwise.
 */
export function calculateFinalScore(input: FinalScoreInput): ScoreBreakdown {
  const { practice, stateGoal, profile, userSettings, history } = input;

  const stateFit = calculateStateFit(practice, stateGoal);
  const longTermGoalFit = calculateLongTermGoalFit(practice, userSettings);
  const personalEvidence = calculatePersonalEvidenceScore(
    practice,
    stateGoal,
    history,
  );
  const sciencePrior = practice.sciencePrior;
  const riskPenalty = practice.contraindicationRisk;

  const acute = profile.stress >= 1.2 || profile.stability <= -1.5;

  const finalScore = acute
    ? stateFit * 0.75 +
      longTermGoalFit * 0.05 +
      personalEvidence * 0.1 +
      sciencePrior * 0.1 -
      riskPenalty
    : stateFit * 0.5 +
      longTermGoalFit * 0.2 +
      personalEvidence * 0.2 +
      sciencePrior * 0.1 -
      riskPenalty;

  return {
    stateFit,
    longTermGoalFit,
    personalEvidence,
    sciencePrior,
    riskPenalty,
    finalScore,
  };
}
