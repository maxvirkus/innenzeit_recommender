import type {
  LongTermGoal,
  MoodId,
  RecommendationResult,
} from '../domain/types';
import { STATE_GOAL_LABELS } from '../domain/explain';

interface Props {
  result: RecommendationResult;
  selectedMoodIds: MoodId[];
  longTermGoals: LongTermGoal[];
  historyCount: number;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

/**
 * Side-by-side comparison of every allowed exercise plus the ones excluded by
 * the safety filter. The plain-language walkthrough lives in
 * {@link CalculationWalkthrough}; this panel is the detailed "why this one over
 * the others" reference and the technical breakdown for developers.
 */
export function DebugPanel({ result, longTermGoals, historyCount }: Props) {
  const { stateGoal, scoredExercises, excludedExercises, primary } = result;

  const evidenceActive = scoredExercises.some(
    (s) => s.breakdown.personalEvidence !== 0,
  );

  return (
    <section className="debug">
      <h2>Alle Übungen im Vergleich</h2>
      <p className="hint">
        Jede erlaubte Übung mit ihrer vollständigen Score-Aufschlüsselung – so
        siehst du, warum die Empfehlung die anderen schlägt. PersonalEv. zeigt,
        wie stark die gespeicherte Historie den Score verschiebt (0 = zu wenig
        Daten).
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Übung</th>
              <th>StateFit</th>
              <th>ProfilFit</th>
              <th>LongTermFit</th>
              <th>PersonalEv.</th>
              <th>Science</th>
              <th>Risk</th>
              <th>Final</th>
            </tr>
          </thead>
          <tbody>
            {scoredExercises.map((s) => (
              <tr
                key={s.exercise.id}
                className={s.exercise.id === primary?.id ? 'row-primary' : ''}
              >
                <td>{s.exercise.title}</td>
                <td>{fmt(s.breakdown.stateFit)}</td>
                <td>{fmt(s.breakdown.profileFit)}</td>
                <td>{fmt(s.breakdown.longTermGoalFit)}</td>
                <td
                  className={
                    s.breakdown.personalEvidence !== 0 ? 'evidence-active' : ''
                  }
                >
                  {fmt(s.breakdown.personalEvidence)}
                </td>
                <td>{fmt(s.breakdown.sciencePrior)}</td>
                <td>-{fmt(s.breakdown.riskPenalty)}</td>
                <td>
                  <strong>{fmt(s.breakdown.finalScore)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {evidenceActive && (
        <p className="hint">
          Hinweis: Dein gespeichertes Profil beeinflusst aktuell das Ranking.
        </p>
      )}

      {excludedExercises.length > 0 && (
        <div className="excluded-plain">
          <strong>Vom Sicherheitsfilter ausgeschlossen:</strong>
          <ul>
            {excludedExercises.map((e) => (
              <li key={e.exercise.id}>
                {e.exercise.title} – {e.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="debug-tech">
        <summary>Technische Details (für Entwickler:innen)</summary>
        <div className="debug-meta">
          <span>
            <strong>Langfristige Ziele:</strong>{' '}
            {longTermGoals.length ? longTermGoals.join(', ') : '—'}
          </span>
          <span>
            <strong>StateGoal (intern):</strong> {stateGoal} (
            {STATE_GOAL_LABELS[stateGoal]})
          </span>
          <span>
            <strong>History-Einträge:</strong> {historyCount}
          </span>
        </div>
      </details>
    </section>
  );
}
