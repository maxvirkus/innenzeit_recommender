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

/**
 * Legacy mood-category, used by the original classifier. Still surfaced for
 * backwards compatibility and the debug view. The recommendation pipeline now
 * primarily works with {@link StateGoal}.
 */
export type Category =
  | 'acute_regulation'
  | 'heaviness_sadness'
  | 'gentle_activation'
  | 'positive_integration'
  | 'neutral';

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

export type PracticeLevel = 'L1' | 'L2' | 'L3';
export type Experience = 'none' | 'some' | 'regular';

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
  | 'goal_visualization';

export interface Exercise {
  id: ExerciseId;
  title: string;
  description: string;
  energyEffect: number;
  stressReduction: number;
  depth: number;
  risk: number;
  /** Legacy free-text tags, still used by the original scoring helpers. */
  suitableFor: string[];
  avoidWhen: string[];
  durationMinutes: number;
  /** Short-term goals this practice serves. */
  stateGoals: StateGoal[];
  /** Long-term goals this practice supports. */
  longTermGoals: LongTermGoal[];
  /** Rough evidence-based plausibility, 0–3. */
  sciencePrior: number;
  /** Rough contraindication risk, 0–3 (drives the risk penalty). */
  contraindicationRisk: number;
  /** Required practice depth level. */
  level: PracticeLevel;
  /** Breath technique, used by the hard safety filters. */
  breathTechnique: BreathTechnique;
}

/** Per-session feedback, used both for local history and central collection. */
export interface SessionFeedback {
  practiceId: string;
  selectedMoodIds: string[];
  profile: MoodProfile;
  stateGoal: StateGoal;
  longTermGoals: LongTermGoal[];
  rating: 1 | 2 | 3 | 4 | 5;
  completed: boolean;
  stoppedEarly: boolean;
  feltWorse?: boolean;
  timestamp: string;
}

export interface ScoreBreakdown {
  stateFit: number;
  longTermGoalFit: number;
  personalEvidence: number;
  sciencePrior: number;
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
  category: Category;
  stateGoal: StateGoal;
  primary: Exercise | null;
  alternatives: Exercise[];
  excludedExercises: ExcludedExercise[];
  scoredExercises: ScoredExercise[];
}
