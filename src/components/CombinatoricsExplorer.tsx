import { useMemo, useState } from 'react';
import { MOODS, MOODS_BY_ID } from '../data/moods';
import { EXERCISES } from '../data/exercises';
import { recommendExercises } from '../domain/recommender';
import { STATE_GOAL_LABELS } from '../domain/explain';
import type {
  Experience,
  ExerciseId,
  LongTermGoal,
  MoodId,
  TimeOfDay,
  UserIntent,
  UserSettings,
} from '../domain/types';

const ALL_MOOD_IDS = MOODS.map((m) => m.id);

const TIMES: { id: TimeOfDay; label: string }[] = [
  { id: 'morning', label: 'Morgen' },
  { id: 'midday', label: 'Mittag' },
  { id: 'evening', label: 'Abend' },
];

const EXPERIENCES: { id: Experience; label: string }[] = [
  { id: 'none', label: 'keine' },
  { id: 'some', label: 'etwas' },
  { id: 'regular', label: 'regelmäßig' },
];

const LONG_TERM_GOALS: { id: LongTermGoal; label: string }[] = [
  { id: 'calm', label: 'Ruhe' },
  { id: 'stress_resilience', label: 'Stressresilienz' },
  { id: 'energy', label: 'Energie' },
  { id: 'focus', label: 'Fokus' },
  { id: 'emotional_processing', label: 'Emotionen verarbeiten' },
  { id: 'self_compassion', label: 'Selbstmitgefühl' },
  { id: 'sleep', label: 'Schlaf' },
  { id: 'deep_experience', label: 'Tiefe Erfahrung' },
];

/** All k-sized combinations of the given items (order-independent). */
function combinations<T>(items: T[], k: number): T[][] {
  const result: T[][] = [];
  const recur = (start: number, combo: T[]) => {
    if (combo.length === k) {
      result.push(combo.slice());
      return;
    }
    for (let i = start; i < items.length; i++) {
      combo.push(items[i]);
      recur(i + 1, combo);
      combo.pop();
    }
  };
  recur(0, []);
  return result;
}

/** Every mood combination the UI allows (1, 2 or 3 states). */
const ALL_MOOD_COMBOS: MoodId[][] = [1, 2, 3].flatMap((k) =>
  combinations(ALL_MOOD_IDS, k),
);

interface Context {
  selectedMoodIds: MoodId[];
  timeOfDay: TimeOfDay;
  userSettings: UserSettings;
  userIntent: UserIntent;
}

interface Reachability {
  /** Exercise ids that were the primary recommendation at least once. */
  everPrimary: Set<ExerciseId>;
  /** Exercise ids that appeared as an alternative at least once. */
  everAlternative: Set<ExerciseId>;
  /** Exercise ids that passed the safety filter at least once. */
  everAllowed: Set<ExerciseId>;
  /** Best (lowest) rank an exercise ever reached among the allowed list. */
  bestRank: Map<ExerciseId, number>;
  /** How often an exercise was the primary recommendation. */
  primaryCount: Map<ExerciseId, number>;
  /** Total number of contexts swept. */
  total: number;
}

function sweep(contexts: Context[]): Reachability {
  const everPrimary = new Set<ExerciseId>();
  const everAlternative = new Set<ExerciseId>();
  const everAllowed = new Set<ExerciseId>();
  const bestRank = new Map<ExerciseId, number>();
  const primaryCount = new Map<ExerciseId, number>();

  for (const ctx of contexts) {
    const r = recommendExercises({ ...ctx, history: [] });
    if (r.primary) {
      everPrimary.add(r.primary.id);
      primaryCount.set(r.primary.id, (primaryCount.get(r.primary.id) ?? 0) + 1);
    }
    for (const alt of r.alternatives) everAlternative.add(alt.id);
    r.scoredExercises.forEach((s, i) => {
      everAllowed.add(s.exercise.id);
      const prev = bestRank.get(s.exercise.id) ?? Infinity;
      if (i + 1 < prev) bestRank.set(s.exercise.id, i + 1);
    });
  }

  return {
    everPrimary,
    everAlternative,
    everAllowed,
    bestRank,
    primaryCount,
    total: contexts.length,
  };
}

type Status = 'primary' | 'alternative' | 'outranked' | 'excluded';

function statusOf(id: ExerciseId, r: Reachability): Status {
  if (r.everPrimary.has(id)) return 'primary';
  if (r.everAlternative.has(id)) return 'alternative';
  if (r.everAllowed.has(id)) return 'outranked';
  return 'excluded';
}

const STATUS_META: Record<
  Status,
  { label: string; hint: string; cls: string }
> = {
  primary: {
    label: 'Als Empfehlung erreichbar',
    hint: 'Wird in mindestens einer Konstellation zur Haupt­empfehlung.',
    cls: 'reach-primary',
  },
  alternative: {
    label: 'Nur als Alternative',
    hint: 'Erscheint höchstens als Alternative, nie als Haupt­empfehlung.',
    cls: 'reach-alt',
  },
  outranked: {
    label: 'Unerreichbar – immer überpunktet',
    hint: 'Kommt durch den Sicherheitsfilter, landet aber nie unter den Top 3.',
    cls: 'reach-out',
  },
  excluded: {
    label: 'Unerreichbar – immer ausgeschlossen',
    hint: 'Wird in jeder geprüften Konstellation hart vom Sicherheitsfilter ausgeschlossen.',
    cls: 'reach-excl',
  },
};

function MoodTags({ ids }: { ids: MoodId[] }) {
  return (
    <span className="combo-tags">
      {ids.map((id) => {
        const m = MOODS_BY_ID[id];
        return (
          <span key={id} className="combo-tag">
            {m.emoji} {m.label}
          </span>
        );
      })}
    </span>
  );
}

/**
 * Third tab: visualises how every combination of states maps to an exercise and
 * which exercises are reachable / unreachable across the parameter space. Pure
 * read-only analysis built on top of the domain `recommendExercises`.
 */
export function CombinatoricsExplorer() {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('midday');
  const [experience, setExperience] = useState<Experience>('none');
  const [allowDeepPractice, setAllowDeepPractice] = useState(false);
  const [allowCombinedSessions, setAllowCombinedSessions] = useState(false);
  const [userIntent, setUserIntent] = useState<UserIntent>('auto');
  const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>([]);
  const [comboSize, setComboSize] = useState<1 | 2 | 3>(2);
  const [globalReach, setGlobalReach] = useState<Reachability | null>(null);

  const settings: UserSettings = useMemo(
    () => ({
      longTermGoals,
      breathworkExperience: experience,
      meditationExperience: experience,
      allowDeepPractice,
      allowCombinedSessions,
    }),
    [longTermGoals, experience, allowDeepPractice, allowCombinedSessions],
  );

  // Mapping table for the currently selected context + combo size.
  const rows = useMemo(() => {
    return combinations(ALL_MOOD_IDS, comboSize).map((combo) => {
      const r = recommendExercises({
        selectedMoodIds: combo,
        timeOfDay,
        userSettings: settings,
        userIntent,
        history: [],
      });
      return {
        combo,
        stateGoal: r.stateGoal,
        primary: r.primary,
        alternatives: r.alternatives,
        excluded: r.excludedExercises.length,
      };
    });
  }, [comboSize, timeOfDay, settings, userIntent]);

  // Reachability under the current settings, swept over all combos × all times.
  const contextReach = useMemo(() => {
    const contexts: Context[] = ALL_MOOD_COMBOS.flatMap((combo) =>
      TIMES.map((t) => ({
        selectedMoodIds: combo,
        timeOfDay: t.id,
        userSettings: settings,
        userIntent,
      })),
    );
    return sweep(contexts);
  }, [settings, userIntent]);

  const runGlobalAnalysis = () => {
    // Curated profiles keep the sweep bounded while still covering the
    // safety-relevant extremes (experience, deep-practice gating, intent).
    const profiles: {
      experience: Experience;
      allowDeepPractice: boolean;
      allowCombinedSessions: boolean;
      userIntent: UserIntent;
    }[] = [
      {
        experience: 'none',
        allowDeepPractice: false,
        allowCombinedSessions: false,
        userIntent: 'auto',
      },
      {
        experience: 'regular',
        allowDeepPractice: false,
        allowCombinedSessions: false,
        userIntent: 'auto',
      },
      {
        experience: 'some',
        allowDeepPractice: true,
        allowCombinedSessions: true,
        userIntent: 'go_deeper',
      },
      {
        experience: 'regular',
        allowDeepPractice: true,
        allowCombinedSessions: true,
        userIntent: 'go_deeper',
      },
    ];
    // Long-term goals: empty plus each single goal, so goal-driven surfacing is
    // captured without iterating all 256 subsets.
    const goalSets: LongTermGoal[][] = [
      [],
      ...LONG_TERM_GOALS.map((g) => [g.id]),
    ];

    const contexts: Context[] = [];
    for (const combo of ALL_MOOD_COMBOS) {
      for (const t of TIMES) {
        for (const p of profiles) {
          for (const goals of goalSets) {
            contexts.push({
              selectedMoodIds: combo,
              timeOfDay: t.id,
              userIntent: p.userIntent,
              userSettings: {
                longTermGoals: goals,
                breathworkExperience: p.experience,
                meditationExperience: p.experience,
                allowDeepPractice: p.allowDeepPractice,
                allowCombinedSessions: p.allowCombinedSessions,
              },
            });
          }
        }
      }
    }
    setGlobalReach(sweep(contexts));
  };

  const toggleGoal = (id: LongTermGoal) =>
    setLongTermGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );

  const unreachableContext = EXERCISES.filter((e) => {
    const s = statusOf(e.id, contextReach);
    return s === 'outranked' || s === 'excluded';
  });

  return (
    <div className="combo-explorer">
      <header className="app-header">
        <h1>Zustände → Übungen: Kombinatorik &amp; Erreichbarkeit</h1>
        <p className="intro">
          Hier siehst du, welche Kombination an Zuständen zu welcher Übung führt –
          über alle 1er-, 2er- und 3er-Kombinationen der neun Zustände. Stell die
          Rahmenbedingungen ein und prüfe, welche Übungen überhaupt{' '}
          <strong>erreichbar</strong> sind und welche nie empfohlen werden.
        </p>
      </header>

      {/* Context controls */}
      <section className="card combo-controls">
        <h2 className="subtle-title">Rahmenbedingungen</h2>

        <div className="control-block">
          <span className="control-label">Tageszeit</span>
          <div className="chip-row">
            {TIMES.map((t) => (
              <button
                key={t.id}
                className={`chip${timeOfDay === t.id ? ' selected' : ''}`}
                onClick={() => setTimeOfDay(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-block">
          <span className="control-label">Atem-/Meditationserfahrung</span>
          <div className="chip-row">
            {EXPERIENCES.map((x) => (
              <button
                key={x.id}
                className={`chip${experience === x.id ? ' selected' : ''}`}
                onClick={() => setExperience(x.id)}
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-block">
          <span className="control-label">Absicht</span>
          <div className="chip-row">
            <button
              className={`chip${userIntent === 'auto' ? ' selected' : ''}`}
              onClick={() => setUserIntent('auto')}
            >
              automatisch
            </button>
            <button
              className={`chip${userIntent === 'go_deeper' ? ' selected' : ''}`}
              onClick={() => setUserIntent('go_deeper')}
            >
              bewusst tiefer
            </button>
          </div>
        </div>

        <div className="toggle-row">
          <label className="toggle">
            <input
              type="checkbox"
              checked={allowDeepPractice}
              onChange={(e) => setAllowDeepPractice(e.target.checked)}
            />
            Tiefe Praxis erlauben
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={allowCombinedSessions}
              onChange={(e) => setAllowCombinedSessions(e.target.checked)}
            />
            Kombinierte Sessions erlauben
          </label>
        </div>

        <div className="control-block">
          <span className="control-label">Langzeitziele</span>
          <div className="chip-row">
            {LONG_TERM_GOALS.map((g) => (
              <button
                key={g.id}
                className={`chip${
                  longTermGoals.includes(g.id) ? ' selected' : ''
                }`}
                onClick={() => toggleGoal(g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Reachability under current settings */}
      <section className="card">
        <h2 className="subtle-title">
          Erreichbarkeit der Übungen
          <span className="reach-sub">
            {' '}
            – bei diesen Einstellungen, über alle {ALL_MOOD_COMBOS.length}{' '}
            Zustands-Kombinationen × 3 Tageszeiten
          </span>
        </h2>

        <div className="reach-legend">
          {(['primary', 'alternative', 'outranked', 'excluded'] as Status[]).map(
            (s) => (
              <span key={s} className={`reach-badge ${STATUS_META[s].cls}`}>
                {STATUS_META[s].label}
              </span>
            ),
          )}
        </div>

        <div className="reach-grid">
          {EXERCISES.map((e) => {
            const s = statusOf(e.id, contextReach);
            const meta = STATUS_META[s];
            const count = contextReach.primaryCount.get(e.id) ?? 0;
            const rank = contextReach.bestRank.get(e.id);
            return (
              <div key={e.id} className={`reach-cell ${meta.cls}`}>
                <div className="reach-cell-head">
                  <span className="reach-cell-title">{e.title}</span>
                  <span className="reach-badge-dot" title={meta.label} />
                </div>
                <p className="reach-cell-status">{meta.label}</p>
                <p className="reach-cell-meta">
                  {s === 'primary' && (
                    <>
                      {count}× Haupt­empfehlung von {contextReach.total}{' '}
                      Konstellationen
                    </>
                  )}
                  {s === 'alternative' && (
                    <>Beste je erreichte Position: {rank ?? '–'}</>
                  )}
                  {s === 'outranked' && (
                    <>Beste je erreichte Position: {rank ?? '–'} (außerhalb Top 3)</>
                  )}
                  {s === 'excluded' && <>Nie durch den Sicherheitsfilter gekommen</>}
                </p>
              </div>
            );
          })}
        </div>

        {unreachableContext.length > 0 ? (
          <p className="hint reach-note">
            <strong>Bei diesen Einstellungen unerreichbar:</strong>{' '}
            {unreachableContext.map((e) => e.title).join(', ')}. Das kann an den
            Einstellungen liegen (z. B. tiefe Praxis nicht erlaubt) – probiere
            andere Rahmenbedingungen oder die globale Prüfung unten.
          </p>
        ) : (
          <p className="hint reach-note">
            Bei diesen Einstellungen ist jede Übung mindestens als Alternative
            erreichbar.
          </p>
        )}
      </section>

      {/* Global reachability */}
      <section className="card">
        <h2 className="subtle-title">Globale Prüfung über alle Einstellungen</h2>
        <p className="hint">
          Prüft jede Übung über alle Zustands-Kombinationen, Tageszeiten,
          Erfahrungs­stufen, Freigaben und Langzeitziele (einzeln). So siehst du,
          ob eine Übung im gesamten Prototyp <strong>überhaupt</strong> empfohlen
          werden kann.
        </p>
        {!globalReach ? (
          <button type="button" className="btn" onClick={runGlobalAnalysis}>
            Globale Erreichbarkeit berechnen
          </button>
        ) : (
          <>
            <p className="hint">
              {globalReach.total.toLocaleString('de-DE')} Konstellationen geprüft.
            </p>
            <div className="reach-grid">
              {EXERCISES.map((e) => {
                const s = statusOf(e.id, globalReach);
                const meta = STATUS_META[s];
                return (
                  <div key={e.id} className={`reach-cell ${meta.cls}`}>
                    <div className="reach-cell-head">
                      <span className="reach-cell-title">{e.title}</span>
                      <span className="reach-badge-dot" title={meta.label} />
                    </div>
                    <p className="reach-cell-status">{meta.label}</p>
                    <p className="reach-cell-meta">{meta.hint}</p>
                  </div>
                );
              })}
            </div>
            {(() => {
              const dead = EXERCISES.filter((e) => {
                const s = statusOf(e.id, globalReach);
                return s === 'outranked' || s === 'excluded';
              });
              return dead.length > 0 ? (
                <p className="hint reach-note reach-warn">
                  <strong>Nie empfohlen (auch nicht als Alternative):</strong>{' '}
                  {dead.map((e) => e.title).join(', ')}. Diese Übungen sind
                  „totes Inventar“ – entweder immer ausgeschlossen oder immer
                  überpunktet. Kandidaten zum Überarbeiten oder Entfernen.
                </p>
              ) : (
                <p className="hint reach-note">
                  Jede Übung ist irgendwo im Parameterraum erreichbar – kein totes
                  Inventar. 🎉
                </p>
              );
            })()}
          </>
        )}
      </section>

      {/* Mapping table */}
      <section className="card">
        <h2 className="subtle-title">Kombination → Übung</h2>
        <div className="control-block">
          <span className="control-label">Anzahl gewählter Zustände</span>
          <div className="chip-row">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                className={`chip${comboSize === n ? ' selected' : ''}`}
                onClick={() => setComboSize(n)}
              >
                {n} {n === 1 ? 'Zustand' : 'Zustände'} ({rowsCountFor(n)})
              </button>
            ))}
          </div>
        </div>

        <div className="table-scroll combo-table-scroll">
          <table className="combo-table">
            <thead>
              <tr>
                <th>Zustände</th>
                <th>Zustandsziel</th>
                <th>Empfehlung</th>
                <th>Alternativen</th>
                <th>Ausgeschl.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.combo.join('+')}>
                  <td>
                    <MoodTags ids={row.combo} />
                  </td>
                  <td>{STATE_GOAL_LABELS[row.stateGoal]}</td>
                  <td>
                    <strong>{row.primary?.title ?? '—'}</strong>
                  </td>
                  <td className="combo-alts">
                    {row.alternatives.length
                      ? row.alternatives.map((a) => a.title).join(', ')
                      : '—'}
                  </td>
                  <td className="combo-num">{row.excluded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function rowsCountFor(k: 1 | 2 | 3): number {
  return combinations(ALL_MOOD_IDS, k).length;
}
