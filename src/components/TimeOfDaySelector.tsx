import type { TimeOfDay } from '../domain/types';

interface Props {
  value: TimeOfDay;
  onChange: (next: TimeOfDay) => void;
}

const OPTIONS: { id: TimeOfDay; label: string }[] = [
  { id: 'morning', label: 'Morgen' },
  { id: 'midday', label: 'Mittag' },
  { id: 'evening', label: 'Abend' },
];

export function TimeOfDaySelector({ value, onChange }: Props) {
  return (
    <div className="segmented" role="tablist" aria-label="Tageszeit">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          className={value === opt.id ? 'active' : ''}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
