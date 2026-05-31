import { MOODS_BY_ID } from '../data/moods';
import type { MoodId, MoodProfile } from './types';

const EMPTY: MoodProfile = {
  valence: 0,
  energy: 0,
  stress: 0,
  heaviness: 0,
  stability: 0,
};

export function calculateMoodProfile(selectedMoodIds: MoodId[]): MoodProfile {
  if (selectedMoodIds.length === 0) return { ...EMPTY };

  const sum: MoodProfile = { ...EMPTY };
  for (const id of selectedMoodIds) {
    const mood = MOODS_BY_ID[id];
    if (!mood) continue;
    sum.valence += mood.profile.valence;
    sum.energy += mood.profile.energy;
    sum.stress += mood.profile.stress;
    sum.heaviness += mood.profile.heaviness;
    sum.stability += mood.profile.stability;
  }

  const n = selectedMoodIds.length;
  return {
    valence: sum.valence / n,
    energy: sum.energy / n,
    stress: sum.stress / n,
    heaviness: sum.heaviness / n,
    stability: sum.stability / n,
  };
}
