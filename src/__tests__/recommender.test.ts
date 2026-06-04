import { describe, it, expect } from 'vitest';
import { recommendExercises } from '../domain/recommender';
import { deriveStateGoal } from '../domain/deriveStateGoal';
import { calculateMoodProfile } from '../domain/calculateMoodProfile';
import {
  calculateEvidenceFit,
  calculateLongTermGoalFit,
  calculateMechanismFit,
  calculatePersonalEvidenceScore,
  calculateProfileImprovementFit,
  calculateSafetyMultiplier,
  calculateStateFit,
} from '../domain/scoring';
import { EXERCISES_BY_ID } from '../data/exercises';
import { MOODS } from '../data/moods';
import type {
  MoodId,
  SessionFeedback,
  TimeOfDay,
  UserIntent,
  UserSettings,
} from '../domain/types';

function run(
  selectedMoodIds: MoodId[],
  timeOfDay: TimeOfDay = 'midday',
  opts: {
    userSettings?: UserSettings;
    userIntent?: UserIntent;
    history?: SessionFeedback[];
  } = {},
) {
  return recommendExercises({ selectedMoodIds, timeOfDay, ...opts });
}

const baseFeedback = (
  over: Partial<SessionFeedback> & Pick<SessionFeedback, 'practiceId'>,
): SessionFeedback => ({
  selectedMoodIds: [],
  profile: { valence: 0, energy: 0, stress: 0, heaviness: 0, stability: 0 },
  stateGoal: 'stress_reduction',
  longTermGoals: [],
  rating: 4,
  timestamp: new Date().toISOString(),
  ...over,
});

describe('recommender – core scenarios', () => {
  it('stressed -> stress_reduction, no power_breath / goal_visualization', () => {
    const r = run(['stressed']);
    expect(r.stateGoal).toBe('stress_reduction');
    expect(r.primary?.id).not.toBe('power_breath');
    expect(r.primary?.id).not.toBe('goal_visualization');
    const ids = r.scoredExercises.map((s) => s.exercise.id);
    expect(ids).not.toContain('power_breath');
    expect(ids).not.toContain('goal_visualization');
  });

  it('tired -> gentle_activation, a gentle low-risk practice is primary', () => {
    const r = run(['tired']);
    expect(r.stateGoal).toBe('gentle_activation');
    // Power Breath must not be the answer for an exhausted beginner.
    expect(['activating_breath', 'energy_meditation']).toContain(r.primary?.id);
    const excludedIds = r.excludedExercises.map((e) => e.exercise.id);
    expect(excludedIds).toContain('power_breath');
  });

  it('tired + stressed -> stress_reduction, exclusions apply', () => {
    const r = run(['tired', 'stressed']);
    expect(r.stateGoal).toBe('stress_reduction');
    const excludedIds = r.excludedExercises.map((e) => e.exercise.id);
    expect(excludedIds).toContain('power_breath');
    expect(excludedIds).toContain('goal_visualization');
  });

  it('sad + heavy -> grounding (stabilise first), power_breath excluded', () => {
    const r = run(['sad', 'heavy']);
    // Stability-first triage: very low stability routes to grounding before
    // deeper emotional work, for safety.
    expect(r.stateGoal).toBe('grounding');
    const excludedIds = r.excludedExercises.map((e) => e.exercise.id);
    expect(excludedIds).toContain('power_breath');
    expect(excludedIds).not.toContain('gratitude_reflection');
  });

  it('worst-case pooling: heavy + happy still excludes power_breath', () => {
    // Averaging would dilute heaviness/instability and wrongly allow Power Breath.
    const r = run(['heavy', 'happy']);
    const excludedIds = r.excludedExercises.map((e) => e.exercise.id);
    expect(excludedIds).toContain('power_breath');
  });

  it('happy + content -> positive_integration, a positive practice is primary', () => {
    const r = run(['happy', 'content']);
    expect(r.stateGoal).toBe('positive_integration');
    expect([
      'coherent_breathing',
      'goal_visualization',
      'gratitude_reflection',
    ]).toContain(r.primary?.id);
  });

  it('energized + stressed -> stress_reduction, no power_breath', () => {
    const r = run(['energized', 'stressed']);
    expect(r.stateGoal).toBe('stress_reduction');
    const excludedIds = r.excludedExercises.map((e) => e.exercise.id);
    expect(excludedIds).toContain('power_breath');
  });

  it('evening + tired excludes power_breath', () => {
    const r = run(['tired'], 'evening');
    const excludedIds = r.excludedExercises.map((e) => e.exercise.id);
    expect(excludedIds).toContain('power_breath');
  });

  it('alternatives never include a clearly unfitting practice (negative score)', () => {
    const r = run(['stressed']);
    const altScores = r.alternatives.map(
      (alt) => r.scoredExercises.find((s) => s.exercise.id === alt.id)?.score ?? 0,
    );
    for (const score of altScores) expect(score).toBeGreaterThan(0);
  });
});

describe('deriveStateGoal', () => {
  const intent: UserIntent = 'auto';
  it('stressed -> stress_reduction', () => {
    const p = calculateMoodProfile(['stressed']);
    expect(deriveStateGoal(p, ['stressed'], 'midday', intent)).toBe(
      'stress_reduction',
    );
  });
  it('energized -> focus', () => {
    const p = calculateMoodProfile(['energized']);
    expect(deriveStateGoal(p, ['energized'], 'midday', intent)).toBe('focus');
  });
  it('heavy + sad -> grounding (stability-first)', () => {
    const p = calculateMoodProfile(['heavy', 'sad']);
    expect(deriveStateGoal(p, ['heavy', 'sad'], 'midday', intent)).toBe(
      'grounding',
    );
  });
  it('evening fallback -> evening_regulation', () => {
    const p = calculateMoodProfile(['neutral']);
    expect(deriveStateGoal(p, ['neutral'], 'evening', intent)).toBe(
      'evening_regulation',
    );
  });
});

describe('scoring helpers', () => {
  it('calculateStateFit rewards matching, partial and unrelated goals', () => {
    const ex = EXERCISES_BY_ID['five_four_three_two_one']; // grounding, stress_reduction
    expect(calculateStateFit(ex, 'grounding')).toBe(5); // direct
    expect(calculateStateFit(ex, 'evening_regulation')).toBe(1); // adjacent
    expect(calculateStateFit(ex, 'focus')).toBe(-2); // unrelated
  });

  it('calculateLongTermGoalFit caps at +4', () => {
    const ex = EXERCISES_BY_ID['four_six_breathing']; // calm, stress_resilience, sleep
    const fit = calculateLongTermGoalFit(ex, {
      longTermGoals: ['calm', 'stress_resilience', 'sleep'],
      breathworkExperience: 'some',
      meditationExperience: 'some',
      allowDeepPractice: false,
      allowCombinedSessions: false,
    });
    expect(fit).toBe(4);
  });

  it('personal evidence stays near neutral with few entries (Bayesian smoothing)', () => {
    const ex = EXERCISES_BY_ID['physiological_sigh'];
    const history = [
      baseFeedback({ practiceId: 'physiological_sigh', stateGoal: 'stress_reduction' }),
      baseFeedback({ practiceId: 'physiological_sigh', stateGoal: 'stress_reduction' }),
    ];
    const score = calculatePersonalEvidenceScore(ex, 'stress_reduction', history);
    // Two mildly positive ratings nudge but don't dominate.
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.4);
  });

  it('feltWorse drives personal evidence strongly negative', () => {
    const ex = EXERCISES_BY_ID['physiological_sigh'];
    const history = Array.from({ length: 3 }, () =>
      baseFeedback({
        practiceId: 'physiological_sigh',
        stateGoal: 'stress_reduction',
        rating: 2,
        feltWorse: true,
      }),
    );
    expect(
      calculatePersonalEvidenceScore(ex, 'stress_reduction', history),
    ).toBeLessThan(-0.5);
  });

  it('feedback transfers partially across the same family', () => {
    const ex = EXERCISES_BY_ID['physiological_sigh'];
    const sameFamily = ex.family;
    const history = [
      baseFeedback({
        practiceId: 'some_other_practice',
        family: sameFamily,
        stateGoal: 'stress_reduction',
        rating: 5,
        completed: true,
      }),
    ];
    // A strong positive rating on a sibling practice nudges this one upward.
    expect(
      calculatePersonalEvidenceScore(ex, 'stress_reduction', history),
    ).toBeGreaterThan(0);
  });

  it('calculateMechanismFit rewards mechanisms matching the goal', () => {
    const sigh = EXERCISES_BY_ID['physiological_sigh'];
    // slow/parasympathetic breathing should fit stress_reduction better than focus
    expect(
      calculateMechanismFit(sigh, 'stress_reduction'),
    ).toBeGreaterThanOrEqual(calculateMechanismFit(sigh, 'gentle_activation'));
  });

  it('calculateEvidenceFit stays within 0..3', () => {
    for (const id of Object.keys(EXERCISES_BY_ID)) {
      const v = calculateEvidenceFit(EXERCISES_BY_ID[id].evidenceProfile);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(3);
    }
  });

  it('safety multiplier dampens intense practices under high stress', () => {
    const settings: UserSettings = {
      longTermGoals: [],
      breathworkExperience: 'some',
      meditationExperience: 'some',
      allowDeepPractice: false,
      allowCombinedSessions: false,
    };
    const power = EXERCISES_BY_ID['power_breath'];
    const highStress = calculateMoodProfile(['stressed']);
    const m = calculateSafetyMultiplier(highStress, power, settings, 'midday');
    expect(m).toBeLessThan(1);
    expect(m).toBeGreaterThanOrEqual(0);
  });
});

describe('safety – new hard filters', () => {
  it('excludes rapid breathing for breathwork beginners', () => {
    const r = run(['tired'], 'midday', {
      userSettings: {
        longTermGoals: [],
        breathworkExperience: 'none',
        meditationExperience: 'some',
        allowDeepPractice: false,
        allowCombinedSessions: false,
      },
    });
    const excludedIds = r.excludedExercises.map((e) => e.exercise.id);
    expect(excludedIds).toContain('power_breath');
  });
});

describe('coherent breathing placement', () => {
  it('positive_integration allows a positive practice as primary', () => {
    const r = run(['happy', 'content']);
    expect(r.stateGoal).toBe('positive_integration');
    expect([
      'coherent_breathing',
      'goal_visualization',
      'gratitude_reflection',
    ]).toContain(r.primary?.id);
  });
});

describe('profile fit – differentiation within a goal', () => {
  it('rewards a stress reducer for a stressed profile, not for a calm one', () => {
    const sigh = EXERCISES_BY_ID['physiological_sigh']; // strong stress down
    const stressed = calculateMoodProfile(['stressed']);
    const calm = calculateMoodProfile(['peaceful']);
    expect(
      calculateProfileImprovementFit(sigh, stressed, 'stress_reduction'),
    ).toBeGreaterThan(0);
    expect(
      calculateProfileImprovementFit(sigh, calm, 'stress_reduction'),
    ).toBeLessThanOrEqual(0);
  });

  it('rewards a gentle activator for a flat, low-energy profile', () => {
    const act = EXERCISES_BY_ID['activating_breath']; // raises energy
    const tired = calculateMoodProfile(['tired']);
    expect(
      calculateProfileImprovementFit(act, tired, 'gentle_activation'),
    ).toBeGreaterThan(0);
  });
});

describe('variety – the profile actually changes the winner', () => {
  it('mood pairs map to more than three distinct primary practices', () => {
    const ids = MOODS.map((m) => m.id);
    const primaries = new Set<string>();
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const r = run([ids[i], ids[j]]);
        if (r.primary) primaries.add(r.primary.id);
      }
    }
    // The old goal-only model collapsed every pair onto 3 practices.
    expect(primaries.size).toBeGreaterThan(3);
  });
});
