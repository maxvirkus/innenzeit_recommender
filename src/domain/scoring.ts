import type {
  Exercise,
  MoodProfile,
  ScoreBreakdown,
  SessionFeedback,
  StateGoal,
  UserSettings,
} from './types';

/**
 * Goals that are clinically adjacent: a practice serving one is a *partial*
 * fit for the other. Used to soften the otherwise binary state fit so closely
 * related calming practices aren't punished as hard as truly unrelated ones.
 */
const ADJACENT_GOALS: Record<StateGoal, StateGoal[]> = {
  grounding: ['stress_reduction', 'evening_regulation'],
  stress_reduction: ['grounding', 'evening_regulation'],
  gentle_activation: ['focus'],
  focus: ['gentle_activation', 'positive_integration'],
  emotional_support: ['grounding'],
  positive_integration: ['focus'],
  evening_regulation: ['grounding', 'stress_reduction'],
};

/**
 * Short-term fit: does the practice serve the current state goal?
 *  +5  direct match (the goal is in the practice's stateGoals)
 *  +1  partial match (the practice serves an adjacent goal)
 *  -2  no relation
 */
export function calculateStateFit(
  practice: Exercise,
  stateGoal: StateGoal,
): number {
  if (practice.stateGoals.includes(stateGoal)) return 5;
  const adjacent = ADJACENT_GOALS[stateGoal];
  if (practice.stateGoals.some((g) => adjacent.includes(g))) return 1;
  return -2;
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

/**
 * Desired change per mood dimension: how far, and in which direction, we'd like
 * to move the user toward a balanced baseline. Positive means "raise this",
 * negative means "lower this". This is what a practice should counteract.
 */
export function calculateDesiredChange(profile: MoodProfile): MoodProfile {
  const desired: MoodProfile = {
    valence: 0,
    energy: 0,
    stress: 0,
    heaviness: 0,
    stability: 0,
  };

  // Bring elevated stress / heaviness back down.
  if (profile.stress > 0) desired.stress = -profile.stress;
  if (profile.heaviness > 0) desired.heaviness = -profile.heaviness;
  // Lift low stability / low mood back up.
  if (profile.stability < 0) desired.stability = -profile.stability;
  if (profile.valence < 0) desired.valence = -profile.valence;
  // Energy is bidirectional: gently lift when flat (and not stressed),
  // down-regulate when wired (high energy *and* stressed).
  if (profile.energy < 0 && profile.stress < 1) desired.energy = -profile.energy;
  else if (profile.energy > 0 && profile.stress >= 1)
    desired.energy = -profile.energy;

  return desired;
}

/**
 * Profile fit: how well the practice's intended effect (`targets`) matches the
 * change the user actually needs (`calculateDesiredChange`). A dot product –
 * a practice that lowers stress scores well for a stressed user, and poorly
 * (or negative) for an already calm one. Scaled and clamped so it sits on a
 * comparable scale to {@link calculateStateFit}.
 */
export function calculateProfileFit(
  practice: Exercise,
  profile: MoodProfile,
): number {
  const d = calculateDesiredChange(profile);
  const t = practice.targets;
  const dot =
    t.valence * d.valence +
    t.energy * d.energy +
    t.stress * d.stress +
    t.heaviness * d.heaviness +
    t.stability * d.stability;

  const scaled = dot / 3;
  return Math.max(-4, Math.min(6, scaled));
}

export interface FinalScoreInput {
  practice: Exercise;
  stateGoal: StateGoal;
  profile: MoodProfile;
  userSettings: UserSettings;
  history: SessionFeedback[];
}

/**
 * Whether the profile is in an *acute* state (high stress or low stability), in
 * which case the immediate fit to the current state dominates the weighting.
 */
export function isAcuteProfile(profile: MoodProfile): boolean {
  return profile.stress >= 1.2 || profile.stability <= -1.5;
}

/**
 * Combines all signals into a single score plus a transparent breakdown.
 *
 * Two weighting modes:
 *  - **acute** (high stress or low stability): the immediate fit to the current
 *    state dominates (state goal + profile fit); long-term goals step back.
 *  - **calm**: more room for long-term goals and personal preference.
 *
 * `stateFit` keeps the recommendation in the right *category*; `profileFit`
 * then differentiates *within* that category by how well the practice
 * counteracts the specific profile, so different mood combinations lead to
 * different practices instead of collapsing onto one winner per goal.
 *
 * The risk penalty is weighted on the same scale as the benefits so a risky
 * practice is discouraged proportionally rather than dominating the sum.
 */
export function calculateFinalScore(input: FinalScoreInput): ScoreBreakdown {
  const { practice, stateGoal, profile, userSettings, history } = input;

  const stateFit = calculateStateFit(practice, stateGoal);
  const profileFit = calculateProfileFit(practice, profile);
  const longTermGoalFit = calculateLongTermGoalFit(practice, userSettings);
  const personalEvidence = calculatePersonalEvidenceScore(
    practice,
    stateGoal,
    history,
  );
  const sciencePrior = practice.sciencePrior;
  const riskPenalty = practice.contraindicationRisk;

  const acute = isAcuteProfile(profile);

  const finalScore = acute
    ? stateFit * 0.45 +
      profileFit * 0.5 +
      longTermGoalFit * 0.05 +
      personalEvidence * 0.15 +
      sciencePrior * 0.1 -
      riskPenalty * 0.5
    : stateFit * 0.35 +
      profileFit * 0.35 +
      longTermGoalFit * 0.2 +
      personalEvidence * 0.2 +
      sciencePrior * 0.15 -
      riskPenalty * 0.4;

  return {
    stateFit,
    profileFit,
    longTermGoalFit,
    personalEvidence,
    sciencePrior,
    riskPenalty,
    finalScore,
  };
}
