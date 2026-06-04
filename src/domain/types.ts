export type MoodId =
  | 'peaceful'
  | 'happy'
  | 'content'
  | 'energized'
  | 'neutral'
  | 'tired'
  | 'heavy'
  | 'sad'
  | 'stressed';

export type TimeOfDay = 'morning' | 'midday' | 'evening';

/** Long-term onboarding goals, set once per user in the settings panel. */
export type LongTermGoal =
  | 'calm'
  | 'stress_resilience'
  | 'energy'
  | 'focus'
  | 'emotional_processing'
  | 'self_compassion'
  | 'sleep'
  | 'deep_experience';

/** Short-term goal derived from the current state for a single session. */
export type StateGoal =
  | 'grounding'
  | 'stress_reduction'
  | 'gentle_activation'
  | 'focus'
  | 'emotional_support'
  | 'positive_integration'
  | 'evening_regulation';

/**
 * How much psychological depth / readiness a practice asks for. This is a
 * property of the *practice itself* and is unrelated to the later per-exercise
 * experience tiers (the future "3 levels of one exercise"). Kept deliberately
 * free of "L1/L2/L3" naming to avoid that clash.
 */
export type DepthCategory = 'basic' | 'moderate' | 'deep';
export type Experience = 'none' | 'some' | 'regular';

/**
 * Practice family — the broad category a practice belongs to. Used to link
 * practices to evidence sources and to weight personal feedback transfer
 * between similar practices.
 */
export type PracticeFamily =
  | 'slow_breathing'
  | 'grounding'
  | 'attention_focus'
  | 'self_compassion'
  | 'body_scan'
  | 'gratitude'
  | 'visualization'
  | 'activation_breathing';

/**
 * Assumed working mechanism of a practice. The recommender scores by *mechanism
 * fit* to the goal rather than hard-wiring practices to goals, so the reasoning
 * stays explainable and grounded in plausible principles.
 */
export type Mechanism =
  | 'parasympathetic_activation'
  | 'attentional_anchoring'
  | 'sensory_grounding'
  | 'cognitive_reappraisal'
  | 'self_compassion'
  | 'positive_affect_broadening'
  | 'behavioral_activation'
  | 'interoceptive_awareness';

/**
 * Multi-facet evidence/plausibility profile of a practice family. Replaces the
 * old single `sciencePrior`. Each facet is 0–3. This is deliberately framed as
 * *plausibility leitplanken*, not "scientific proof".
 */
export interface EvidenceProfile {
  /** How well the practice family is empirically supported. */
  evidenceStrength: 0 | 1 | 2 | 3;
  /** Does the assumed working mechanism fit the goal? */
  mechanismFit: 0 | 1 | 2 | 3;
  /** Does the evidence transfer to ordinary app users? */
  populationFit: 0 | 1 | 2 | 3;
  /** Is it well guidable in an app without a facilitator? */
  appSuitability: 0 | 1 | 2 | 3;
  /** How safe is it under self-guidance? */
  safetyConfidence: 0 | 1 | 2 | 3;
}

/** Explicit intent for the current session (drives deep-practice gating). */
export type UserIntent = 'auto' | 'go_deeper';

/** Breath technique tag used by the hard safety filters. */
export type BreathTechnique = 'rapid_breathing' | 'breath_hold' | null;

export interface UserSettings {
  longTermGoals: LongTermGoal[];
  breathworkExperience: Experience;
  meditationExperience: Experience;
  allowDeepPractice: boolean;
  allowCombinedSessions: boolean;
}

export interface MoodProfile {
  valence: number;
  energy: number;
  stress: number;
  heaviness: number;
  stability: number;
}

export interface Mood {
  id: MoodId;
  label: string;
  emoji: string;
  profile: MoodProfile;
}

export type ExerciseId =
  | 'five_four_three_two_one'
  | 'physiological_sigh'
  | 'four_six_breathing'
  | 'box_breathing'
  | 'coherent_breathing'
  | 'power_breath'
  | 'body_scan'
  | 'self_compassion'
  | 'goal_visualization'
  | 'activating_breath'
  | 'energy_meditation'
  | 'gratitude_reflection'
  | 'breath_counting'
  | 'hand_on_heart'
  | 'grounding_breath'
  | 'emotion_body_location';

export interface Exercise {
  id: ExerciseId;
  title: string;
  description: string;
  durationMinutes: number;
  /** Short-term goals this practice serves. */
  stateGoals: StateGoal[];
  /** Long-term goals this practice supports. */
  longTermGoals: LongTermGoal[];
  /** Broad practice family (used for evidence links + feedback transfer). */
  family: PracticeFamily;
  /** Assumed working mechanisms. */
  mechanisms: Mechanism[];
  /** Multi-facet evidence/plausibility profile (replaces sciencePrior). */
  evidenceProfile: EvidenceProfile;
  /** Rough contraindication risk, 0–3 (drives the hard risk penalty). */
  contraindicationRisk: number;
  /** Physical activation/arousal demand of the practice, 0–3. */
  intensity: 0 | 1 | 2 | 3;
  /** How emotionally deep/confronting the practice is, 0–3. */
  emotionalDepth: 0 | 1 | 2 | 3;
  /** How much depth / readiness the practice asks for. */
  depthCategory: DepthCategory;
  /**
   * Intended physiological/affective nudge of the practice on each mood
   * dimension (roughly -3..+3). Positive raises the dimension, negative lowers
   * it. Used by the profile-improvement score to reward practices that move the
   * profile toward a balanced target state.
   */
  targets: MoodProfile;
  /** Breath technique, used by the hard safety filters. */
  breathTechnique: BreathTechnique;
}

/** Per-session feedback, used both for local history and central collection. */
export interface SessionFeedback {
  practiceId: string;
  /** Practice family of the rated exercise (for feedback transfer). */
  family?: PracticeFamily;
  selectedMoodIds: string[];
  profile: MoodProfile;
  stateGoal: StateGoal;
  longTermGoals: LongTermGoal[];
  rating: 1 | 2 | 3 | 4 | 5;
  /** Did the recommendation feel fitting for the mood? (UX rating) */
  fitFeeling?: 1 | 2 | 3 | 4 | 5;
  /** Was the explanation understandable? (UX rating) */
  explanationClarity?: 1 | 2 | 3 | 4 | 5;
  /** Did the user complete the practice? */
  completed?: boolean;
  /** Did the user stop early? */
  stoppedEarly?: boolean;
  /** Did the user feel worse afterwards? */
  feltWorse?: boolean;
  /** Free-text comment. */
  comment?: string;
  /** Free-text: what would have fit better. */
  betterFit?: string;
  timestamp: string;
}

export interface ScoreBreakdown {
  stateFit: number;
  /** Profile-improvement fit: how far the practice moves toward the target. */
  profileFit: number;
  mechanismFit: number;
  longTermGoalFit: number;
  personalEvidence: number;
  /** Evidence/plausibility fit derived from the evidence profile (0–3). */
  evidenceFit: number;
  /** Soft safety damping multiplier applied to the base score (0–1). */
  safetyMultiplier: number;
  /** Hard risk penalty subtracted after the multiplier. */
  riskPenalty: number;
  finalScore: number;
}

export interface ScoredExercise {
  exercise: Exercise;
  score: number;
  breakdown: ScoreBreakdown;
}

export interface ExcludedExercise {
  exercise: Exercise;
  reason: string;
}

export interface RecommendationResult {
  profile: MoodProfile;
  stateGoal: StateGoal;
  primary: Exercise | null;
  alternatives: Exercise[];
  excludedExercises: ExcludedExercise[];
  scoredExercises: ScoredExercise[];
  /** Score difference between the top practice and the runner-up. */
  scoreGap: number;
  /** True when the runner-up scored almost as high (scoreGap < 0.3). */
  hasCloseAlternative: boolean;
}
