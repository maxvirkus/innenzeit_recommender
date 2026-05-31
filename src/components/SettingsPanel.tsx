import type {
  Experience,
  LongTermGoal,
  UserIntent,
  UserSettings,
} from '../domain/types';

interface Props {
  settings: UserSettings;
  onChange: (next: UserSettings) => void;
  userIntent: UserIntent;
  onIntentChange: (next: UserIntent) => void;
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

const MAX_GOALS = 3;

export function SettingsPanel({
  settings,
  onChange,
  userIntent,
  onIntentChange,
}: Props) {
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

      <label className="field-label">Tiefe Praxis (L3) freischalten</label>
      <p className="hint">
        Tiefe Praxis (L3) kombiniert Atem und Meditation und kann stark
        veränderte Zustände auslösen. Sie wird nur empfohlen, wenn alle drei
        Schalter aktiv sind und dein Befinden stabil ist – nie automatisch bei
        Stress oder Überwältigung.
      </p>
      <div className="toggle-row">
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.allowDeepPractice}
            onChange={(ev) =>
              onChange({ ...settings, allowDeepPractice: ev.target.checked })
            }
          />
          Tiefe Praxis erlauben
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.allowCombinedSessions}
            onChange={(ev) =>
              onChange({
                ...settings,
                allowCombinedSessions: ev.target.checked,
              })
            }
          />
          Kombinierte Sessions erlauben
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={userIntent === 'go_deeper'}
            onChange={(ev) =>
              onIntentChange(ev.target.checked ? 'go_deeper' : 'auto')
            }
          />
          Intention „tiefer gehen“
        </label>
      </div>
      <p className="hint">
        <strong>Kombinierte Sessions</strong> = Atem- und Meditationsübungen in
        einer längeren Sitzung verbinden (die Grundlage für Tiefe Praxis / L3).
      </p>
    </details>
  );
}
