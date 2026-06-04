import { MOODS_BY_ID } from '../data/moods';
import type { MoodId, MoodProfile } from './types';

const EMPTY: MoodProfile = {
  valence: 0,
  energy: 0,
  stress: 0,
  heaviness: 0,
  stability: 0,
};

/**
 * Builds the mood profile from the selected moods.
 *
 * Two aggregation strategies are combined on purpose:
 *
 * - **valence** and **energy** are *averaged* — they describe the overall tone
 *   and arousal, where opposite moods may legitimately balance out.
 * - **stress**, **heaviness** and **stability** use *worst-case pooling*
 *   (max for stress/heaviness, min for stability). These are the
 *   safety-relevant dimensions: a single strongly negative signal must not be
 *   diluted by a calmer one. Selecting "Schwer" + "Froh" must still register as
 *   heavy so the hard safety filters can react.
 */
export function calculateMoodProfile(selectedMoodIds: MoodId[]): MoodProfile {
  if (selectedMoodIds.length === 0) return { ...EMPTY };

  let valenceSum = 0;
  let energySum = 0;
  let stressMax = -Infinity;
  let heavinessMax = -Infinity;
  let stabilityMin = Infinity;
  let count = 0;

  for (const id of selectedMoodIds) {
    const mood = MOODS_BY_ID[id];
    if (!mood) continue;
    valenceSum += mood.profile.valence;
    energySum += mood.profile.energy;
    stressMax = Math.max(stressMax, mood.profile.stress);
    heavinessMax = Math.max(heavinessMax, mood.profile.heaviness);
    stabilityMin = Math.min(stabilityMin, mood.profile.stability);
    count += 1;
  }

  if (count === 0) return { ...EMPTY };

  return {
    valence: valenceSum / count,
    energy: energySum / count,
    stress: stressMax,
    heaviness: heavinessMax,
    stability: stabilityMin,
  };
}
