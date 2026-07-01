import type {
  Experience,
  LongTermGoal,
  PracticeIntensity,
  UserSettings,
} from '../domain/types';

interface Props {
  settings: UserSettings;
  onChange: (next: UserSettings) => void;
}

const LONG_TERM_GOALS: { id: LongTermGoal; label: string }[] = [
  { id: 'calm', label: 'Ruhe' },
  { id: 'stress_resilience', label: 'Stressresilienz' },
  { id: 'energy', label: 'Energie' },
  { id: 'focus', label: 'Fokus' },
  { id: 'emotional_processing', label: 'Emotionale Verarbeitung' },
  { id: 'self_compassion', label: 'Selbstmitgefühl' },
  { id: 'sleep', label: 'Schlaf' },
  { id: 'deep_experience', label: 'Tiefe Erfahrung' },
];

const EXPERIENCES: { id: Experience; label: string }[] = [
  { id: 'none', label: 'Keine' },
  { id: 'some', label: 'Etwas' },
  { id: 'regular', label: 'Regelmäßig' },
];

const INTENSITIES: { id: PracticeIntensity; label: string; hint: string }[] = [
  {
    id: 'gentle',
    label: 'Sanft',
    hint: 'Ruhige, sanfte Übungen. Intensive Techniken werden zurückgestellt.',
  },
  {
    id: 'balanced',
    label: 'Ausgewogen',
    hint: 'Ausgewogene Mischung – die Empfehlung richtet sich allein nach deinem Zustand.',
  },
  {
    id: 'intense',
    label: 'Intensiv & tief',
    hint: 'Bevorzugt fordernde und tiefere Übungen – passend zu deiner Erfahrung und nur bei stabilem Befinden. Sicherheitsfilter bleiben aktiv.',
  },
];

const MAX_GOALS = 3;

export function SettingsPanel({ settings, onChange }: Props) {
  const toggleGoal = (id: LongTermGoal) => {
    const selected = settings.longTermGoals.includes(id);
    if (selected) {
      onChange({
        ...settings,
        longTermGoals: settings.longTermGoals.filter((g) => g !== id),
      });
    } else {
      if (settings.longTermGoals.length >= MAX_GOALS) return;
      onChange({ ...settings, longTermGoals: [...settings.longTermGoals, id] });
    }
  };

  const limitReached = settings.longTermGoals.length >= MAX_GOALS;

  return (
    <details className="card settings">
      <summary>Erweitert: Onboarding &amp; Einstellungen (optional)</summary>

      <p className="hint">
        Diese Einstellungen sind für den schnellen Test nicht nötig. Sie
        beeinflussen langfristige Ziele, erlaubte Tiefe und Sicherheitsfilter.
      </p>

      <label className="field-label">
        Langfristige Ziele (max. {MAX_GOALS})
      </label>
      <div className="chip-row">
        {LONG_TERM_GOALS.map((g) => {
          const selected = settings.longTermGoals.includes(g.id);
          const disabled = !selected && limitReached;
          return (
            <button
              key={g.id}
              type="button"
              className={`chip${selected ? ' selected' : ''}`}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => toggleGoal(g.id)}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      <label className="field-label">Erfahrung Atemübungen</label>
      <div className="segmented">
        {EXPERIENCES.map((e) => (
          <button
            key={e.id}
            type="button"
            className={settings.breathworkExperience === e.id ? 'active' : ''}
            onClick={() =>
              onChange({ ...settings, breathworkExperience: e.id })
            }
          >
            {e.label}
          </button>
        ))}
      </div>

      <label className="field-label">Erfahrung Meditation</label>
      <div className="segmented">
        {EXPERIENCES.map((e) => (
          <button
            key={e.id}
            type="button"
            className={settings.meditationExperience === e.id ? 'active' : ''}
            onClick={() =>
              onChange({ ...settings, meditationExperience: e.id })
            }
          >
            {e.label}
          </button>
        ))}
      </div>

      <label className="field-label">Praxis-Intensität</label>
      <div className="segmented">
        {INTENSITIES.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={settings.practiceIntensity === opt.id ? 'active' : ''}
            onClick={() =>
              onChange({ ...settings, practiceIntensity: opt.id })
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="hint">
        {
          INTENSITIES.find((o) => o.id === settings.practiceIntensity)?.hint
        }{' '}
        Wie stark intensivere Übungen bevorzugt werden, hängt zusätzlich von
        deiner angegebenen Erfahrung ab.
      </p>
    </details>
  );
}
