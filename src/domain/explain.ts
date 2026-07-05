import type {
  Mechanism,
  MoodProfile,
  ScoreBreakdown,
  ScoredExercise,
  StateGoal,
} from './types.js';

/** Human-readable German labels for the short-term state goal. */
export const STATE_GOAL_LABELS: Record<StateGoal, string> = {
  grounding: 'Erden und Stabilisieren',
  stress_reduction: 'Stress reduzieren',
  gentle_activation: 'Sanft aktivieren',
  focus: 'Fokus bündeln',
  emotional_support: 'Emotionalen Halt geben',
  positive_integration: 'Positives vertiefen',
  evening_regulation: 'Zur Ruhe kommen',
};

/** Plain-language German labels for the assumed working mechanisms. */
export const MECHANISM_LABELS: Record<Mechanism, string> = {
  parasympathetic_activation: 'beruhigender Atemrhythmus',
  attentional_anchoring: 'Aufmerksamkeit verankern',
  sensory_grounding: 'über Sinne und Körper stabilisieren',
  cognitive_reappraisal: 'die Perspektive sanft verändern',
  self_compassion: 'freundlicher Umgang mit dir selbst',
  positive_affect_broadening: 'positive Wahrnehmung vertiefen',
  behavioral_activation: 'sanft in Aktivität kommen',
  interoceptive_awareness: 'Körperempfindungen wahrnehmen',
};

/** Human-readable German labels for the five mood dimensions. */
export const DIMENSION_LABELS: Record<keyof MoodProfile, string> = {
  valence: 'Stimmung',
  energy: 'Energie',
  stress: 'Stress',
  heaviness: 'Schwere',
  stability: 'Stabilität',
};

export interface ExplanationFactor {
  /** Short plain-language label shown to the team. */
  label: string;
  /** Whether this factor speaks for (true) or against (false) the practice. */
  positive: boolean;
}

export interface Explanation {
  /** One-sentence headline tying the practice to the current goal. */
  summary: string;
  /** Plain-language factors that drove the score. */
  factors: ExplanationFactor[];
}

/**
 * Turns a score breakdown into a plain-language explanation a non-technical
 * team member can read. Mirrors the scoring weights, but as readable reasons
 * instead of numbers.
 */
export function explainScore(
  scored: ScoredExercise,
  stateGoal: StateGoal,
): Explanation {
  const b: ScoreBreakdown = scored.breakdown;
  const goalLabel = STATE_GOAL_LABELS[stateGoal];
  const factors: ExplanationFactor[] = [];

  if (b.stateFit >= 5) {
    factors.push({
      label: `Passt direkt zum Zustandsziel „${goalLabel}“`,
      positive: true,
    });
  } else {
    factors.push({
      label: `Passt nur indirekt zum Zustandsziel „${goalLabel}“`,
      positive: false,
    });
  }

  const mechanismLabels = scored.exercise.mechanisms.map(
    (m) => MECHANISM_LABELS[m],
  );
  if (b.mechanismFit >= 2 && mechanismLabels.length > 0) {
    factors.push({
      label: `Wirkprinzip passt zum Ziel: ${mechanismLabels.join(', ')}`,
      positive: true,
    });
  }

  if (b.profileFit > 0.5) {
    factors.push({
      label: 'Dürfte deinen aktuellen Zustand spürbar ausgleichen',
      positive: true,
    });
  } else if (b.profileFit < -0.5) {
    factors.push({
      label: 'Würde deinen aktuellen Zustand eher verstärken',
      positive: false,
    });
  }

  if (b.longTermGoalFit > 0) {
    factors.push({
      label: 'Unterstützt deine Onboarding-Ziele',
      positive: true,
    });
  }

  if (b.personalEvidence > 0.5) {
    factors.push({
      label: 'Hat dir in ähnlichen Situationen geholfen',
      positive: true,
    });
  } else if (b.personalEvidence < -0.5) {
    factors.push({
      label: 'Hat in ähnlichen Situationen eher nicht geholfen',
      positive: false,
    });
  }

  if (b.evidenceFit >= 2) {
    factors.push({
      label: 'Durch Forschung gut plausibel gemacht',
      positive: true,
    });
  }

  if (b.safetyMultiplier < 1) {
    factors.push({
      label: 'Für deinen aktuellen Zustand etwas behutsamer dosiert',
      positive: false,
    });
  }

  if (b.riskPenalty === 0) {
    factors.push({ label: 'Sehr risikoarm', positive: true });
  } else if (b.riskPenalty >= 2) {
    factors.push({ label: 'Erhöhtes Risiko – mit Vorsicht', positive: false });
  }

  if (b.intensityAdjustment > 0.3) {
    factors.push({
      label: 'Passt zu deinem Wunsch nach intensiverer, fordernder Praxis',
      positive: true,
    });
  } else if (b.intensityAdjustment < -0.3) {
    factors.push({
      label: 'Bewusst zurückgestuft, weil du sanftere Praxis bevorzugst',
      positive: false,
    });
  }

  const summary =
    b.stateFit >= 5
      ? `Empfohlen, weil sie am besten zum Zustandsziel „${goalLabel}“ passt.`
      : `Beste verfügbare Option für das Zustandsziel „${goalLabel}“.`;

  return { summary, factors };
}

/**
 * Explains why an alternative ranked below the primary recommendation.
 * Returns a short comparison sentence.
 */
export function explainAlternative(
  alternative: ScoredExercise,
  primary: ScoredExercise,
  stateGoal: StateGoal,
): string {
  const diff = primary.score - alternative.score;
  const goalLabel = STATE_GOAL_LABELS[stateGoal];

  if (alternative.breakdown.stateFit < primary.breakdown.stateFit) {
    return `Passt etwas weniger direkt zum Zustandsziel „${goalLabel}“ als die Hauptempfehlung.`;
  }
  if (alternative.breakdown.riskPenalty > primary.breakdown.riskPenalty) {
    return 'Gute Alternative, aber etwas risikoreicher.';
  }
  if (diff <= 0.5) {
    return 'Fast gleichwertig – eine sehr gute Alternative.';
  }
  return 'Solide Alternative mit etwas geringerer Gesamtpassung.';
}

/** Looks up the scored entry (incl. breakdown) for an exercise id. */
export function findScored(
  scoredExercises: ScoredExercise[],
  exerciseId: string,
): ScoredExercise | undefined {
  return scoredExercises.find((s) => s.exercise.id === exerciseId);
}
