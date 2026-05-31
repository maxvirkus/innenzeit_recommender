import type {
  MoodProfile,
  ScoreBreakdown,
  ScoredExercise,
  StateGoal,
} from './types';

/** Human-readable German labels for the short-term state goal. */
export const STATE_GOAL_LABELS: Record<StateGoal, string> = {
  grounding: 'Erdung & Stabilisierung',
  stress_reduction: 'Stress reduzieren',
  gentle_activation: 'Sanfte Aktivierung',
  focus: 'Fokus & Klarheit',
  emotional_support: 'Emotionale Unterstützung',
  positive_integration: 'Positives vertiefen',
  evening_regulation: 'Zur Ruhe kommen (Abend)',
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

  if (b.sciencePrior >= 2) {
    factors.push({ label: 'Gut durch Studien gestützt', positive: true });
  }

  if (b.riskPenalty === 0) {
    factors.push({ label: 'Sehr risikoarm', positive: true });
  } else if (b.riskPenalty >= 2) {
    factors.push({ label: 'Erhöhtes Risiko – mit Vorsicht', positive: false });
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
