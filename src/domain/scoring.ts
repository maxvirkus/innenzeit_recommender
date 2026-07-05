import type {
  Exercise,
  EvidenceProfile,
  Experience,
  Mechanism,
  MoodProfile,
  ScoreBreakdown,
  SessionFeedback,
  StateGoal,
  TimeOfDay,
  UserSettings,
} from './types.js';

/**
 * Turns an experience tier into a 0..1 factor. Used to scale how strongly an
 * intense/deep practice may be boosted and how much its risk/technique damping
 * is relaxed: only experienced users who opt into intensity get the full
 * effect.
 */
function experienceFactor(exp: Experience): number {
  return exp === 'regular' ? 1 : exp === 'some' ? 0.5 : 0;
}

/**
 * The experience tier that governs a given practice: breath-technique practices
 * are gated by breathwork experience, everything else by meditation experience.
 * This is what finally gives `meditationExperience` a real effect.
 */
function relevantExperience(exercise: Exercise, settings: UserSettings): Experience {
  return exercise.breathTechnique
    ? settings.breathworkExperience
    : settings.meditationExperience;
}

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
 * Preferred working mechanisms per state goal. The recommender rewards
 * practices whose assumed mechanism matches the goal, instead of hard-wiring
 * specific practices to goals. This keeps the reasoning explainable and tied to
 * plausible principles rather than fixed lists.
 */
export const PREFERRED_MECHANISMS: Record<StateGoal, Mechanism[]> = {
  grounding: ['sensory_grounding', 'attentional_anchoring'],
  stress_reduction: ['parasympathetic_activation', 'attentional_anchoring'],
  gentle_activation: ['behavioral_activation', 'attentional_anchoring'],
  focus: ['attentional_anchoring'],
  emotional_support: ['self_compassion', 'interoceptive_awareness'],
  positive_integration: ['positive_affect_broadening', 'self_compassion'],
  evening_regulation: ['parasympathetic_activation', 'interoceptive_awareness'],
};

/**
 * Mechanism fit: how well the practice's assumed mechanisms match the goal's
 * preferred ones. +2 per direct match, capped at +4. Scale 0–4.
 */
export function calculateMechanismFit(
  practice: Exercise,
  stateGoal: StateGoal,
): number {
  const preferred = PREFERRED_MECHANISMS[stateGoal];
  let fit = 0;
  for (const m of practice.mechanisms) {
    if (preferred.includes(m)) fit += 2;
  }
  return Math.min(fit, 4);
}

/**
 * Evidence/plausibility fit derived from the multi-facet evidence profile.
 * Output stays on the same 0–3 scale the old `sciencePrior` used. This is
 * framed as *plausibility leitplanken*, never as proof that a given practice is
 * optimal.
 */
export function calculateEvidenceFit(evidence: EvidenceProfile): number {
  return (
    0.3 * evidence.evidenceStrength +
    0.25 * evidence.mechanismFit +
    0.15 * evidence.populationFit +
    0.15 * evidence.appSuitability +
    0.15 * evidence.safetyConfidence
  );
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

/**
 * Target ("balanced") profile we'd like to move the user toward for a given
 * state goal. Stress/heaviness should settle at 0, stability slightly positive,
 * mood at least neutral (without artificially maximising it), and energy depends
 * on the goal.
 */
export function desiredProfileFor(
  stateGoal: StateGoal,
  profile: MoodProfile,
): MoodProfile {
  const energyByGoal: Record<StateGoal, number> = {
    gentle_activation: 1,
    focus: 0.5,
    evening_regulation: -0.5,
    stress_reduction: 0,
    grounding: 0,
    emotional_support: 0,
    positive_integration: 0.5,
  };
  return {
    valence: Math.max(0, profile.valence),
    energy: energyByGoal[stateGoal],
    stress: 0,
    heaviness: 0,
    stability: 1,
  };
}

const DISTANCE_WEIGHTS: Record<keyof MoodProfile, number> = {
  stress: 1.4,
  stability: 1.3,
  heaviness: 1.2,
  energy: 1.0,
  valence: 0.8,
};

/**
 * Dimensions where moving *past* the target in the beneficial direction is not
 * a problem and must not be penalised: less stress, less heaviness and more
 * valence are always welcome. Energy and stability stay symmetric, because
 * overshooting them (e.g. over-activating an already wired profile) genuinely
 * degrades the state. Without this, a practice that reduces stress *strongly*
 * is unfairly scored worse than a milder one purely for "overshooting" zero.
 */
const FREE_OVERSHOOT: Partial<Record<keyof MoodProfile, 'below' | 'above'>> = {
  stress: 'below',
  heaviness: 'below',
  valence: 'above',
};

function weightedDistance(a: MoodProfile, b: MoodProfile): number {
  let d = 0;
  for (const key of Object.keys(DISTANCE_WEIGHTS) as (keyof MoodProfile)[]) {
    const diff = a[key] - b[key];
    const free = FREE_OVERSHOOT[key];
    let dist: number;
    if (free === 'below' && diff < 0) dist = 0;
    else if (free === 'above' && diff > 0) dist = 0;
    else dist = Math.abs(diff);
    d += DISTANCE_WEIGHTS[key] * dist;
  }
  return d;
}

/**
 * Profile-improvement fit: does the practice move the profile *closer* to a
 * sensible target state? We simulate `predictedAfter = profile + targets` and
 * compare the weighted distance to the desired profile before and after. A
 * positive value means the practice reduces the gap; a negative value means it
 * would push the user further from balance (e.g. an activating practice for an
 * already wired profile). Clamped to roughly the same scale as state fit.
 *
 * Replaces the older dot-product `profileFit`: asking "does this bring the user
 * closer to a good target state?" is more meaningful than "does it nudge in
 * roughly the right direction?".
 */
export function calculateProfileImprovementFit(
  practice: Exercise,
  profile: MoodProfile,
  stateGoal: StateGoal,
  doseFactor = 1,
): number {
  const desired = desiredProfileFor(stateGoal, profile);
  const predictedAfter: MoodProfile = {
    valence: profile.valence + practice.targets.valence * doseFactor,
    energy: profile.energy + practice.targets.energy * doseFactor,
    stress: profile.stress + practice.targets.stress * doseFactor,
    heaviness: profile.heaviness + practice.targets.heaviness * doseFactor,
    stability: profile.stability + practice.targets.stability * doseFactor,
  };
  const beforeDistance = weightedDistance(profile, desired);
  const afterDistance = weightedDistance(predictedAfter, desired);
  const improvement = beforeDistance - afterDistance;
  return Math.max(-4, Math.min(6, improvement));
}

/** Single feedback's observed effect (richer than just the star rating). */
function observedEffect(fb: SessionFeedback): number {
  const ratingCentered = fb.rating - 3; // -2..+2
  return (
    0.5 * ratingCentered +
    0.5 * (fb.completed ? 1 : 0) -
    0.7 * (fb.stoppedEarly ? 1 : 0) -
    1.5 * (fb.feltWorse ? 1 : 0)
  );
}

/** Relevance weight of a feedback entry for a given practice + state goal. */
function feedbackWeight(
  fb: SessionFeedback,
  practice: Exercise,
  stateGoal: StateGoal,
): number {
  if (fb.practiceId === practice.id) return 1.0;
  if (fb.family && fb.family === practice.family) return 0.5;
  if (fb.stateGoal === stateGoal) return 0.3;
  return 0;
}

/**
 * Personal evidence with Bayesian smoothing. Instead of needing a hard minimum
 * of entries, we shrink toward a neutral prior so a couple of ratings nudge but
 * don't dominate. Feedback transfers partially across the same family / state
 * goal. Clamped to -2..+2.
 */
export function calculatePersonalEvidenceScore(
  practice: Exercise,
  stateGoal: StateGoal,
  history: SessionFeedback[],
): number {
  const priorMean = 0;
  const priorWeight = 5;

  let weightedSum = 0;
  let weightTotal = 0;
  for (const fb of history) {
    const w = feedbackWeight(fb, practice, stateGoal);
    if (w === 0) continue;
    weightedSum += w * observedEffect(fb);
    weightTotal += w;
  }

  const smoothed =
    (priorMean * priorWeight + weightedSum) / (priorWeight + weightTotal);
  return Math.max(-2, Math.min(2, smoothed));
}

/**
 * Soft safety damping. Hard safety rules still exclude practices entirely; this
 * multiplier only *dampens* risky-but-allowed practices depending on the
 * current state. Range 0–1.
 *
 * The acute-state damping (high stress, low stability, high heaviness) is always
 * hard. The technique damping (rapid breathing / breath hold), however, is
 * *softened* for experienced users who explicitly chose the `intense` intensity:
 * those techniques only ever pass the hard filter in already non-acute states,
 * so relaxing their soft penalty lets the intense practices these users asked
 * for actually surface, without weakening any acute-state protection.
 */
export function calculateSafetyMultiplier(
  profile: MoodProfile,
  exercise: Exercise,
  userSettings: UserSettings,
  timeOfDay: TimeOfDay,
): number {
  const soften =
    userSettings.practiceIntensity === 'intense'
      ? experienceFactor(relevantExperience(exercise, userSettings))
      : 0;

  let m = 1.0;
  if (profile.stress >= 1.2 && exercise.intensity >= 2) m -= 0.2;
  if (profile.stability <= -1.5 && exercise.depthCategory !== 'basic') m -= 0.3;
  if (profile.heaviness >= 1.5 && exercise.emotionalDepth >= 3) m -= 0.2;
  if (exercise.breathTechnique === 'rapid_breathing') m -= 0.2 * (1 - soften);
  if (exercise.breathTechnique === 'breath_hold') m -= 0.2 * (1 - soften);
  if (timeOfDay === 'evening' && exercise.targets.energy > 1) m -= 0.2;
  return Math.max(0, Math.min(1, m));
}

export interface FinalScoreInput {
  practice: Exercise;
  stateGoal: StateGoal;
  profile: MoodProfile;
  userSettings: UserSettings;
  history: SessionFeedback[];
  timeOfDay: TimeOfDay;
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
 *   baseScore = weighted sum of stateFit, profileFit, mechanismFit,
 *               longTermGoalFit, personalEvidence, evidenceFit
 *   finalScore = baseScore * safetyMultiplier - hardRiskPenalty
 *
 * Two weighting modes:
 *  - **acute** (high stress / low stability): immediate fit dominates.
 *  - **calm**: more room for long-term goals and personal preference.
 *
 * The soft `safetyMultiplier` gently dampens risky-but-allowed practices; the
 * hard risk penalty is kept moderate so safety isn't double-counted.
 */
export function calculateFinalScore(input: FinalScoreInput): ScoreBreakdown {
  const { practice, stateGoal, profile, userSettings, history, timeOfDay } =
    input;

  const stateFit = calculateStateFit(practice, stateGoal);
  const profileFit = calculateProfileImprovementFit(
    practice,
    profile,
    stateGoal,
  );
  const mechanismFit = calculateMechanismFit(practice, stateGoal);
  const longTermGoalFit = calculateLongTermGoalFit(practice, userSettings);
  const personalEvidence = calculatePersonalEvidenceScore(
    practice,
    stateGoal,
    history,
  );
  const evidenceFit = calculateEvidenceFit(practice.evidenceProfile);
  const safetyMultiplier = calculateSafetyMultiplier(
    profile,
    practice,
    userSettings,
    timeOfDay,
  );
  const riskPenalty = practice.contraindicationRisk;

  const acute = isAcuteProfile(profile);

  const baseScore = acute
    ? stateFit * 0.9 +
      profileFit * 1.0 +
      mechanismFit * 0.6 +
      longTermGoalFit * 0.1 +
      personalEvidence * 0.4 +
      evidenceFit * 0.4
    : stateFit * 0.7 +
      profileFit * 0.7 +
      mechanismFit * 0.5 +
      longTermGoalFit * 0.4 +
      personalEvidence * 0.5 +
      evidenceFit * 0.4;

  // Intensity preference. Experience/permission previously only *unlocked*
  // intense practices; the scoring then still buried them. This term makes the
  // chosen intensity an actual preference:
  //  - `intense` (non-acute only): reward arousal with a *convex* bonus so the
  //    genuinely most-intense practices are favoured (not just every mildly
  //    activating one), scaled by the user's relevant experience, and strongly
  //    relax the hard risk penalty — the UI now shows a safety disclaimer for
  //    these practices. No boost in acute states.
  //  - `gentle`: steer away from intense practices.
  //  - `balanced`: neutral (unchanged behaviour).
  const relExp = experienceFactor(relevantExperience(practice, userSettings));
  let intensityAdjustment = 0;
  let effectiveRiskPenalty = riskPenalty;
  if (userSettings.practiceIntensity === 'intense' && !acute) {
    intensityAdjustment = ((practice.intensity * practice.intensity) / 9) * 4 * relExp;
    effectiveRiskPenalty = riskPenalty * (1 - 0.8 * relExp);
  } else if (userSettings.practiceIntensity === 'gentle') {
    intensityAdjustment = -practice.intensity * 0.5;
  }

  const finalScore =
    baseScore * safetyMultiplier +
    intensityAdjustment -
    effectiveRiskPenalty * 0.4;

  return {
    stateFit,
    profileFit,
    mechanismFit,
    longTermGoalFit,
    personalEvidence,
    evidenceFit,
    safetyMultiplier,
    riskPenalty,
    intensityAdjustment,
    finalScore,
  };
}
