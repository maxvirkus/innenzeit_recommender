import type {
  MoodId,
  MoodProfile,
  RecommendationResult,
  TimeOfDay,
  UserSettings,
} from '../domain/types';
import { MOODS_BY_ID } from '../data/moods';
import { DIMENSION_LABELS, STATE_GOAL_LABELS } from '../domain/explain';
import { explainStateGoal } from '../domain/deriveStateGoal';
import {
  calculateDesiredChange,
  isAcuteProfile,
} from '../domain/scoring';

interface Props {
  result: RecommendationResult;
  selectedMoodIds: MoodId[];
  timeOfDay: TimeOfDay;
  settings: UserSettings;
  userIntent: Parameters<typeof explainStateGoal>[3];
}

const DIMENSIONS: (keyof MoodProfile)[] = [
  'valence',
  'energy',
  'stress',
  'heaviness',
  'stability',
];

/** Aggregation rule label per dimension (mirrors calculateMoodProfile). */
const AGG_RULE: Record<keyof MoodProfile, string> = {
  valence: 'Mittelwert',
  energy: 'Mittelwert',
  stress: 'Maximum',
  heaviness: 'Maximum',
  stability: 'Minimum',
};

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function signed(n: number): string {
  const v = fmt(Math.abs(n));
  if (n > 0) return `+${v}`;
  if (n < 0) return `−${v}`;
  return '0';
}

/**
 * Step-by-step, real-time breakdown of how the current recommendation was
 * computed. Reads only from the already-computed `result`, so it always
 * reflects exactly what the algorithm did — it never recomputes the ranking.
 */
export function CalculationWalkthrough({
  result,
  selectedMoodIds,
  timeOfDay,
  settings,
  userIntent,
}: Props) {
  const { profile, stateGoal, scoredExercises } = result;
  const moods = selectedMoodIds
    .map((id) => MOODS_BY_ID[id])
    .filter(Boolean);

  const goalExplanation = explainStateGoal(
    profile,
    selectedMoodIds,
    timeOfDay,
    userIntent,
  );
  const desired = calculateDesiredChange(profile);
  const acute = isAcuteProfile(profile);

  // The primary scored entry (first allowed-as-primary in the ranking).
  const primaryScored =
    scoredExercises.find((s) => s.exercise.id === result.primary?.id) ??
    scoredExercises[0];

  const excluded = result.excludedExercises;

  return (
    <details className="calc" open>
      <summary className="calc-summary">
        <h2>Live-Berechnung — Schritt für Schritt</h2>
        <span className="calc-summary-hint">
          Zeigt in Echtzeit, wie aus deiner Auswahl die Empfehlung entsteht.
          (Klicken zum Ein-/Ausklappen)
        </span>
      </summary>

      {/* Step 1 — moods → profile */}
      <div className="calc-step">
        <div className="calc-step-head">
          <span className="calc-step-num">1</span>
          <h3>Zustände werden zu einem Profil verrechnet</h3>
        </div>
        <p className="calc-note">
          Jeder gewählte Zustand bringt fünf Werte mit (-2 bis +2). Stimmung und
          Energie werden <strong>gemittelt</strong>; Stress und Schwere nehmen
          das <strong>Maximum</strong>, Stabilität das <strong>Minimum</strong>{' '}
          („worst-case“, damit ein belastender Zustand nicht verwässert wird).
        </p>
        <div className="table-scroll">
          <table className="calc-table calc-table-centered">
            <thead>
              <tr>
                <th>Dimension</th>
                {moods.map((m) => (
                  <th key={m.id}>
                    {m.emoji} {m.label}
                  </th>
                ))}
                <th>Regel</th>
                <th>Profil</th>
              </tr>
            </thead>
            <tbody>
              {DIMENSIONS.map((dim) => (
                <tr key={dim}>
                  <td>{DIMENSION_LABELS[dim]}</td>
                  {moods.map((m) => (
                    <td key={m.id} className="num">
                      {signed(m.profile[dim])}
                    </td>
                  ))}
                  <td className="calc-rule">{AGG_RULE[dim]}</td>
                  <td className="num calc-result">{fmt(profile[dim])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 2 — profile → state goal */}
      <div className="calc-step">
        <div className="calc-step-head">
          <span className="calc-step-num">2</span>
          <h3>Aus dem Profil wird ein Zustandsziel abgeleitet</h3>
        </div>
        <p className="calc-note">
          Acht Regeln werden der Reihe nach geprüft (vom spezifischsten Bedarf
          zum allgemeinsten). Die erste zutreffende Regel gewinnt.
        </p>
        <div className="calc-callout">
          <div className="calc-callout-rule">
            Regel {goalExplanation.ruleIndex} greift
          </div>
          <div className="calc-callout-reason">{goalExplanation.reason}</div>
          <div className="calc-callout-goal">
            → Zustandsziel: <strong>{STATE_GOAL_LABELS[stateGoal]}</strong>
          </div>
        </div>
      </div>

      {/* Step 3 — safety filter */}
      <div className="calc-step">
        <div className="calc-step-head">
          <span className="calc-step-num">3</span>
          <h3>Sicherheitsfilter prüft jede Übung</h3>
        </div>
        <p className="calc-note">
          Bevor bewertet wird, fliegen riskante oder unpassende Übungen raus –
          unabhängig vom Zustandsziel. Was hier ausgeschlossen wird, kann gar
          nicht erst empfohlen werden.
        </p>
        {excluded.length === 0 ? (
          <div className="calc-callout calc-callout-ok">
            <div className="calc-callout-goal">
              ✓ Keine Übung ausgeschlossen – alle {scoredExercises.length}{' '}
              Übungen sind für dieses Profil sicher.
            </div>
          </div>
        ) : (
          <ul className="calc-excluded">
            {excluded.map((e) => (
              <li key={e.exercise.id}>
                <span className="calc-excluded-title">{e.exercise.title}</span>
                <span className="calc-excluded-reason">{e.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Step 4 — desired change */}
      <div className="calc-step">
        <div className="calc-step-head">
          <span className="calc-step-num">4</span>
          <h3>Welche Veränderung wäre hilfreich?</h3>
        </div>
        <p className="calc-note">
          Aus dem Profil wird ein <strong>Bedarfs-Vektor</strong> gebildet:
          erhöhter Stress und Schwere sollen runter, niedrige Stabilität und
          Stimmung hoch. Energie wird nur bei Bedarf angehoben oder gesenkt.
        </p>
        <div className="calc-vectors">
          {DIMENSIONS.map((dim) => (
            <div
              key={dim}
              className={`calc-vec ${
                desired[dim] === 0
                  ? 'zero'
                  : desired[dim] > 0
                    ? 'up'
                    : 'down'
              }`}
            >
              <span className="calc-vec-label">{DIMENSION_LABELS[dim]}</span>
              <span className="calc-vec-val">
                {desired[dim] === 0 ? '—' : signed(desired[dim])}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 5 — scoring the winner */}
      {primaryScored && (
        <div className="calc-step">
          <div className="calc-step-head">
            <span className="calc-step-num">5</span>
            <h3>
              Bewertung der Empfehlung: {primaryScored.exercise.title}
            </h3>
          </div>
          <p className="calc-note">
            Jede erlaubte Übung bekommt einen Score aus sechs Bausteinen. Der{' '}
            <strong>ProfilFit</strong> ist das Skalarprodukt aus der Wirkung der
            Übung und dem Bedarf aus Schritt 3 — so unterscheiden sich Übungen{' '}
            <em>innerhalb</em> desselben Zustandsziels.
          </p>

          <div className="calc-formula">
            <div className="calc-formula-mode">
              Gewichtungsmodus:{' '}
              <strong>{acute ? 'akut' : 'ausgeglichen'}</strong>{' '}
              <span className="calc-note">
                ({acute
                  ? 'Stress ≥ 1,2 oder Stabilität ≤ -1,5 → akuter Zustand dominiert'
                  : 'kein akuter Zustand → mehr Raum für Langzeitziele & Personalisierung'}
                )
              </span>
            </div>
            <table className="calc-table calc-score-table">
              <thead>
                <tr>
                  <th>Baustein</th>
                  <th>Wert</th>
                  <th>Gewicht</th>
                  <th>Beitrag</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['StateFit', primaryScored.breakdown.stateFit, acute ? 0.45 : 0.35],
                    ['ProfilFit', primaryScored.breakdown.profileFit, acute ? 0.5 : 0.35],
                    ['LangzeitFit', primaryScored.breakdown.longTermGoalFit, acute ? 0.05 : 0.2],
                    ['Persönl. Evidenz', primaryScored.breakdown.personalEvidence, acute ? 0.15 : 0.2],
                    ['Wissenschaft', primaryScored.breakdown.sciencePrior, acute ? 0.1 : 0.15],
                    ['Risiko', -primaryScored.breakdown.riskPenalty, acute ? 0.5 : 0.4],
                  ] as [string, number, number][]
                ).map(([label, value, weight]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td className="num">{signed(value)}</td>
                    <td className="num">× {weight}</td>
                    <td className="num calc-result">
                      {signed(value * weight)}
                    </td>
                  </tr>
                ))}
                <tr className="calc-total">
                  <td colSpan={3}>Gesamt-Score</td>
                  <td className="num">
                    <strong>{fmt(primaryScored.breakdown.finalScore)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 6 — ranking */}
      <div className="calc-step">
        <div className="calc-step-head">
          <span className="calc-step-num">6</span>
          <h3>Ranking entscheidet die Empfehlung</h3>
        </div>
        <p className="calc-note">
          Alle erlaubten Übungen werden nach Score sortiert. Die höchste wird zur
          Hauptempfehlung, die nächsten beiden mit positivem Score zu
          Alternativen.
        </p>
        <ol className="calc-ranking">
          {scoredExercises.slice(0, 5).map((s, i) => (
            <li
              key={s.exercise.id}
              className={s.exercise.id === result.primary?.id ? 'is-primary' : ''}
            >
              <span className="calc-rank-num">{i + 1}</span>
              <span className="calc-rank-title">{s.exercise.title}</span>
              {s.exercise.id === result.primary?.id && (
                <span className="calc-rank-badge">Empfehlung</span>
              )}
              <span className="calc-rank-score">
                {fmt(s.breakdown.finalScore)}
              </span>
            </li>
          ))}
        </ol>
        {settings.longTermGoals.length === 0 && (
          <p className="hint">
            Tipp: Ohne Onboarding-Ziele und ohne gespeicherte Historie zählen vor
            allem StateFit und ProfilFit. Setze Ziele in den Einstellungen, um
            den Einfluss von LangzeitFit zu sehen.
          </p>
        )}
      </div>
    </details>
  );
}
