import type { Mood } from '../domain/types';

export const MOODS: Mood[] = [
  {
    id: 'peaceful',
    label: 'Friedlich',
    emoji: '🍃',
    profile: { valence: 2, energy: 0, stress: -2, heaviness: -1, stability: 2 },
  },
  {
    id: 'happy',
    label: 'Froh',
    emoji: '☀️',
    profile: { valence: 2, energy: 1, stress: -1, heaviness: -1, stability: 1 },
  },
  {
    id: 'content',
    label: 'Zufrieden',
    emoji: '🙂',
    profile: { valence: 2, energy: 0, stress: -1, heaviness: -1, stability: 2 },
  },
  {
    id: 'energized',
    label: 'Energiegeladen',
    emoji: '⚡',
    profile: { valence: 1, energy: 2, stress: 0, heaviness: -1, stability: 0 },
  },
  {
    id: 'neutral',
    label: 'Neutral',
    emoji: '😐',
    profile: { valence: 0, energy: 0, stress: 0, heaviness: 0, stability: 0 },
  },
  {
    id: 'tired',
    label: 'Müde',
    emoji: '🌙',
    profile: { valence: -1, energy: -2, stress: 0, heaviness: 1, stability: -1 },
  },
  {
    id: 'heavy',
    label: 'Schwer',
    emoji: '☁️',
    profile: { valence: -2, energy: -1, stress: 1, heaviness: 2, stability: -2 },
  },
  {
    id: 'sad',
    label: 'Traurig',
    emoji: '🌧️',
    profile: { valence: -2, energy: -1, stress: 0, heaviness: 2, stability: -1 },
  },
  {
    id: 'stressed',
    label: 'Gestresst',
    emoji: '🌪️',
    profile: { valence: -2, energy: 1, stress: 2, heaviness: 1, stability: -2 },
  },
];

export const MOODS_BY_ID: Record<string, Mood> = Object.fromEntries(
  MOODS.map((m) => [m.id, m]),
);
