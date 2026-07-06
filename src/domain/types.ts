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



/** Breath technique tag used by the hard safety filters. */
export type BreathTechnique = 'rapid_breathing' | 'breath_hold' | null;

/**
 * A single, time-boxed guidance step of a practice. The steps are played back
 * in order; the on-screen text and the spoken text are identical (start muted,
 * TTS optional). Kept as plain data so the same content can be exported as JSON
 * and reused on other platforms (iOS, Flutter).
 */
export interface InstructionStep {
  /** How long this step is shown / spoken, in seconds. */
  durationSeconds: number;
  /** Guidance text (German). Shown on screen and used verbatim for speech. */
  text: string;
}

/**
 * How intense / deep a user wants their practices to be. Replaces the old
 * three-way deep-practice gate (allowDeepPractice + allowCombinedSessions +
 * go-deeper intent) with a single, understandable choice:
 *  - `gentle`   – steer toward calm, low-arousal practices; intense ones are
 *                 damped and deep practices stay locked.
 *  - `balanced` – neutral default; no boost, deep practices stay locked.
 *  - `intense`  – actively reward more intense practices *and* unlock deep
 *                 practices (still only when the profile is stable and the user
 *                 has the relevant experience). Hard safety filters stay hard.
 */
export type PracticeIntensity = 'gentle' | 'balanced' | 'intense';

export interface UserSettings {
  longTermGoals: LongTermGoal[];
  breathworkExperience: Experience;
  meditationExperience: Experience;
  practiceIntensity: PracticeIntensity;
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
  | 'emotion_body_location'
  | 'loving_kindness'
  | 'savoring'
  | 'morning_activation'
  | 'walking_grounding'
  | 'progressive_relaxation'
  | 'sleep_body_scan'
  | 'rain_emotions'
  | 'mindful_ritual';

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
  /**
   * Inhaltliche Tageszeit-Bindung. Übungen mit Affinität werden zur
   * Gegen-Tageszeit hart ausgeschlossen (morning ↛ evening und umgekehrt),
   * bleiben zur passenden Zeit und im freien Konfigurator erreichbar.
   */
  timeAffinity?: 'morning' | 'evening' | null;
  /**
   * Umgebungs-Anforderung. 'anywhere' (Default) = überall durchführbar;
   * 'space_to_move' = braucht Platz/Bewegung und wird deshalb nie automatische
   * Primär-Empfehlung (Funktionsprinzip: App muss überall funktionieren),
   * bleibt aber als Alternative und im Konfigurator wählbar.
   */
  environment?: 'anywhere' | 'space_to_move';
  /**
   * Time-boxed guidance steps for guided playback. The sum of all
   * `durationSeconds` equals `durationMinutes * 60`.
   */
  instructions: InstructionStep[];
}

/**
 * A single spoken word with its exact position in the pre-generated audio
 * track. Derived from the character-level alignment so the app can highlight
 * the currently spoken word (karaoke style) within its line.
 */
export interface NarrationWord {
  text: string;
  startSeconds: number;
  endSeconds: number;
}

/**
 * One spoken line of narration with its exact position in the pre-generated
 * audio track. Produced by the ElevenLabs generation script from the practice's
 * instruction text (split into sentences) plus the returned character-level
 * timestamps. Drives line-by-line, lyrics-style scrolling in perfect sync, and
 * carries per-word timings for word-level highlighting.
 */
export interface NarrationLine {
  text: string;
  startSeconds: number;
  endSeconds: number;
  /** Per-word timings within this line, for karaoke-style highlighting. */
  words?: NarrationWord[];
}

/** Pre-generated narration for one practice: an audio file plus timed lines. */
export interface Narration {
  /** Path to the generated audio file, served from `public/` (e.g. `/audio/x.mp3`). */
  audioUrl: string;
  /** Total audio length in seconds. */
  durationSeconds: number;
  /** Sentence-level lines with exact start/end offsets in the audio. */
  lines: NarrationLine[];
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
  /** Was the explanation understandable? (UX rating) */
  explanationClarity?: 1 | 2 | 3 | 4 | 5;
  /**
   * How well the guidance *instructions* fit (content/wording of the steps).
   * Optional — only set when the user listened to the guided exercise.
   */
  instructionsQuality?: 1 | 2 | 3 | 4 | 5;
  /**
   * How well the *voice delivery* fit: emphasis and pauses of the narration.
   * Optional — only set when the user listened to the guided exercise.
   */
  voiceDeliveryQuality?: 1 | 2 | 3 | 4 | 5;
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
  /**
   * Intensity-preference adjustment folded into the final score: positive when
   * an experienced user opts into „intense“ (rewards arousal), negative under
   * „gentle“, zero under „balanced“.
   */
  intensityAdjustment: number;
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
  /**
   * Short German safety note for the primary practice when it is physically
   * intense, uses an activating breath technique, or carries elevated risk.
   * `null` for gentle, low-risk practices. Shown as a disclaimer.
   */
  caution: string | null;
}
