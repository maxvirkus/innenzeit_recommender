import type {
  MoodId,
  MoodProfile,
  RecommendationResult,
  TimeOfDay,
  UserSettings,
} from '../domain/types';
import { MOODS_BY_ID } from '../data/moods';
import {
  DIMENSION_LABELS,
  MECHANISM_LABELS,
  STATE_GOAL_LABELS,
  explainScore,
} from '../domain/explain';
import { explainStateGoal } from '../domain/deriveStateGoal';
import { desiredProfileFor, isAcuteProfile } from '../domain/scoring';

interface Props {
  result: RecommendationResult;
  selectedMoodIds: MoodId[];
  timeOfDay: TimeOfDay;
  settings: UserSettings;
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

/** Plain-language direction word for moving from `from` toward `to`. */
function directionWord(
  dim: keyof MoodProfile,
  from: number,
  to: number,
): string {
  const delta = to - from;
  if (Math.abs(delta) < 0.25) return 'ungefähr halten';
  const up = delta > 0;
  switch (dim) {
    case 'valence':
      return up ? 'Stimmung etwas heben' : 'Stimmung etwas senken';
    case 'energy':
      return up ? 'Energie sanft anheben' : 'Energie herunterfahren';
    case 'stress':
      return up ? 'etwas mehr Aktivierung' : 'Anspannung lösen';
    case 'heaviness':
      return up ? 'mehr Tiefe zulassen' : 'Schwere erleichtern';
    case 'stability':
      return up ? 'Stabilität stärken' : 'Stabilität lockern';
  }
}

/**
 * Step-by-step, real-time breakdown of how the current recommendation was
 * computed. Reads only from the already-computed `result`, so it always
 * reflects exactly what the algorithm did — it never recomputes the ranking.
 *
 * Plain language only in the normal flow; raw numbers (profile values, score
 * breakdown) live in an optional, collapsed "Technische Details" section.
 */
export function CalculationWalkthrough({
  result,
  selectedMoodIds,
  timeOfDay,
  settings,
}: Props) {
  const { profile, stateGoal, scoredExercises } = result;
  const moods = selectedMoodIds
    .map((id) => MOODS_BY_ID[id])
    .filter(Boolean);

  const goalExplanation = explainStateGoal(
    profile,
    selectedMoodIds,
    timeOfDay,
  );
  const desired = desiredProfileFor(stateGoal, profile);
  const acute = isAcuteProfile(profile);

  // The primary scored entry (first allowed-as-primary in the ranking).
  const primaryScored =
    scoredExercises.find((s) => s.exercise.id === result.primary?.id) ??
    scoredExercises[0];

  const explanation = primaryScored
    ? explainScore(primaryScored, stateGoal)
    : null;

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
      <details className="calc-step" open>
        <summary className="calc-step-head">
          <span className="calc-step-num">1</span>
          <div className="calc-step-titles">
            <h3>Zustände werden zu einem Profil verrechnet</h3>
            <span className="calc-step-preview">
              Aus 1–3 Zuständen entstehen fünf Profilwerte.
            </span>
          </div>
          <span className="calc-step-chevron" aria-hidden>
            ▸
          </span>
        </summary>
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
      </details>

      {/* Step 2 — profile → state goal */}
      <details className="calc-step">
        <summary className="calc-step-head">
          <span className="calc-step-num">2</span>
          <div className="calc-step-titles">
            <h3>Aus dem Profil wird ein Zustandsziel abgeleitet</h3>
            <span className="calc-step-preview">
              Die erste zutreffende Regel bestimmt das kurzfristige Ziel.
            </span>
          </div>
          <span className="calc-step-chevron" aria-hidden>
            ▸
          </span>
        </summary>
        <p className="calc-note">
          Mehrere Regeln werden der Reihe nach geprüft — von „braucht zuerst
          Halt“ bis hin zu allgemeineren Bedürfnissen. Die erste zutreffende
          Regel gewinnt, damit Sicherheit vor Tiefe geht.
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
      </details>

      {/* Step 3 — safety filter */}
      <details className="calc-step">
        <summary className="calc-step-head">
          <span className="calc-step-num">3</span>
          <div className="calc-step-titles">
            <h3>Sicherheitsfilter prüft jede Übung</h3>
            <span className="calc-step-preview">
              Riskante oder unpassende Übungen werden vorab ausgeschlossen.
            </span>
          </div>
          <span className="calc-step-chevron" aria-hidden>
            ▸
          </span>
        </summary>
        <p className="calc-note">
          Bevor bewertet wird, fliegen riskante oder unpassende Übungen raus –
          unabhängig vom Zustandsziel. Dazu gehört auch die Tageszeit: Übungen
          mit inhaltlicher Zeitbindung (Morgen-Aktivierung, Tagesrückblick,
          Einschlaf-Bodyscan) sind zur Gegen-Tageszeit ausgeschlossen. Tiefe
          Übungen öffnen sich bei stabilem Befinden für Intensität „intensiv“
          oder regelmäßige Meditationserfahrung. Was hier ausgeschlossen wird,
          kann gar nicht erst empfohlen werden; danach wird jede erlaubte Übung
          je nach Zustand noch behutsamer dosiert.
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
      </details>

      {/* Step 4 — desired direction */}
      <details className="calc-step">
        <summary className="calc-step-head">
          <span className="calc-step-num">4</span>
          <div className="calc-step-titles">
            <h3>Welche Veränderung wäre hilfreich?</h3>
            <span className="calc-step-preview">
              In welche Richtung sollte dein Profil sich bewegen?
            </span>
          </div>
          <span className="calc-step-chevron" aria-hidden>
            ▸
          </span>
        </summary>
        <p className="calc-note">
          Zum Zustandsziel gehört ein angestrebter Ziel-Zustand. Die Übungen
          werden danach bewertet, ob sie dein Profil <strong>näher</strong> an
          diesen ausgeglichenen Zustand bringen.
        </p>
        <ul className="calc-directions">
          {DIMENSIONS.map((dim) => (
            <li key={dim}>
              <span className="calc-dir-label">{DIMENSION_LABELS[dim]}</span>
              <span className="calc-dir-word">
                {directionWord(dim, profile[dim], desired[dim])}
              </span>
            </li>
          ))}
        </ul>
      </details>

      {/* Step 5 — why this practice (plain language) */}
      {primaryScored && explanation && (
        <details className="calc-step" open>
          <summary className="calc-step-head">
            <span className="calc-step-num">5</span>
            <div className="calc-step-titles">
              <h3>Warum {primaryScored.exercise.title}?</h3>
              <span className="calc-step-preview">
                Die ausschlaggebenden Gründe für die Hauptempfehlung.
              </span>
            </div>
            <span className="calc-step-chevron" aria-hidden>
              ▸
            </span>
          </summary>
          <p className="calc-note">{explanation.summary}</p>
          <ul className="calc-reasons">
            {explanation.factors.map((f, i) => (
              <li
                key={i}
                className={f.positive ? 'reason-pos' : 'reason-neg'}
              >
                <span className="reason-mark">{f.positive ? '✓' : '·'}</span>
                {f.label}
              </li>
            ))}
          </ul>
          {primaryScored.exercise.mechanisms.length > 0 && (
            <p className="calc-note">
              Angenommenes Wirkprinzip:{' '}
              {primaryScored.exercise.mechanisms
                .map((m) => MECHANISM_LABELS[m])
                .join(', ')}
              .
            </p>
          )}
        </details>
      )}

      {/* Step 6 — ranking (names only, no scores in normal flow) */}
      <details className="calc-step">
        <summary className="calc-step-head">
          <span className="calc-step-num">6</span>
          <div className="calc-step-titles">
            <h3>Reihenfolge der passendsten Übungen</h3>
            <span className="calc-step-preview">
              Rangliste – die passendste wird zur Empfehlung.
            </span>
          </div>
          <span className="calc-step-chevron" aria-hidden>
            ▸
          </span>
        </summary>
        <p className="calc-note">
          Alle erlaubten Übungen werden verglichen. Die passendste wird zur
          Hauptempfehlung – Übungen mit Platz-/Bewegungsbedarf (z.&nbsp;B.
          Gehende Erdung) überspringt der Algorithmus dabei, weil die App
          überall funktionieren soll; sie bleiben als Alternative und im
          Konfigurator wählbar. Die Alternativen kommen bevorzugt aus{' '}
          <em>anderen</em> Übungsfamilien als die Empfehlung (max. eine pro
          Familie), damit die Auswahl Breite zeigt statt dreimal dasselbe
          Prinzip.
          {result.hasCloseAlternative
            ? ' Mehrere Übungen passen hier ähnlich gut.'
            : ''}
        </p>
        <ol className="calc-ranking">
          {scoredExercises.slice(0, 5).map((s) => (
            <li
              key={s.exercise.id}
              className={s.exercise.id === result.primary?.id ? 'is-primary' : ''}
            >
              <span className="calc-rank-title">{s.exercise.title}</span>
              {s.exercise.id === result.primary?.id && (
                <span className="calc-rank-badge">Empfehlung</span>
              )}
            </li>
          ))}
        </ol>
        {settings.longTermGoals.length === 0 && (
          <p className="hint">
            Tipp: Ohne Onboarding-Ziele und ohne gespeicherte Historie zählen vor
            allem die Passung zum Zustand und die erwartete Wirkung. Setze Ziele
            in den Einstellungen, um den Einfluss der Langzeitziele zu sehen.
          </p>
        )}
      </details>

      {/* Optional, collapsed: raw numbers for the curious / for QA */}
      {primaryScored && (
        <details className="calc-technical">
          <summary>Technische Details (Score-Bausteine)</summary>
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
            <div className="table-scroll">
              <table className="calc-table calc-score-table">
                <thead>
                  <tr>
                    <th>Baustein</th>
                    <th>Wert</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ['StateFit', primaryScored.breakdown.stateFit],
                      ['ProfilFit', primaryScored.breakdown.profileFit],
                      ['MechanismFit', primaryScored.breakdown.mechanismFit],
                      ['LangzeitFit', primaryScored.breakdown.longTermGoalFit],
                      [
                        'Persönl. Evidenz',
                        primaryScored.breakdown.personalEvidence,
                      ],
                      ['EvidenzFit', primaryScored.breakdown.evidenceFit],
                      [
                        'Sicherheits-Faktor',
                        primaryScored.breakdown.safetyMultiplier,
                      ],
                      ...(primaryScored.breakdown.intensityAdjustment !== 0
                        ? ([
                            [
                              'Intensitäts-Präferenz',
                              primaryScored.breakdown.intensityAdjustment,
                            ],
                          ] as [string, number][])
                        : []),
                      ['Risiko', -primaryScored.breakdown.riskPenalty],
                    ] as [string, number][]
                  ).map(([label, value]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td className="num">{signed(value)}</td>
                    </tr>
                  ))}
                  <tr className="calc-total">
                    <td>Gesamt-Score</td>
                    <td className="num">
                      <strong>
                        {fmt(primaryScored.breakdown.finalScore)}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </details>
      )}
    </details>
  );
}
