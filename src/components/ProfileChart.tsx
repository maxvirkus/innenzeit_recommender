import type { MoodProfile } from '../domain/types';
import { DIMENSION_LABELS } from '../domain/explain';

interface Props {
  profile: MoodProfile;
}

const DIMENSIONS: (keyof MoodProfile)[] = [
  'valence',
  'energy',
  'stress',
  'heaviness',
  'stability',
];

// Mood values are derived from inputs in the range -2..2.
const MAX = 2;

/**
 * Renders the computed mood profile as centered bars so a non-technical
 * reader can see at a glance how strong each dimension is and in which
 * direction (negative left, positive right).
 */
export function ProfileChart({ profile }: Props) {
  return (
    <div className="profile-chart">
      {DIMENSIONS.map((dim) => {
        const value = profile[dim];
        const pct = (Math.min(Math.abs(value), MAX) / MAX) * 50;
        const positive = value >= 0;
        return (
          <div className="profile-row" key={dim}>
            <span className="profile-label">{DIMENSION_LABELS[dim]}</span>
            <div className="profile-track">
              <div className="profile-center" />
              <div
                className={`profile-bar ${positive ? 'pos' : 'neg'}`}
                style={
                  positive
                    ? { left: '50%', width: `${pct}%` }
                    : { right: '50%', width: `${pct}%` }
                }
              />
            </div>
            <span className="profile-value">{value.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}
