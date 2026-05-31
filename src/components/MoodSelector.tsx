import { MOODS } from '../data/moods';
import type { MoodId } from '../domain/types';

interface Props {
  selected: MoodId[];
  onChange: (next: MoodId[]) => void;
  max?: number;
}

export function MoodSelector({ selected, onChange, max = 3 }: Props) {
  const toggle = (id: MoodId) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      if (selected.length >= max) return;
      onChange([...selected, id]);
    }
  };

  const limitReached = selected.length >= max;

  return (
    <div className="mood-grid" role="group" aria-label="Zustände auswählen">
      {MOODS.map((mood) => {
        const isSelected = selected.includes(mood.id);
        const disabled = !isSelected && limitReached;
        return (
          <button
            key={mood.id}
            type="button"
            className={`mood-card${isSelected ? ' selected' : ''}`}
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => toggle(mood.id)}
          >
            <span className="emoji" aria-hidden>
              {mood.emoji}
            </span>
            <span className="label">{mood.label}</span>
          </button>
        );
      })}
    </div>
  );
}
