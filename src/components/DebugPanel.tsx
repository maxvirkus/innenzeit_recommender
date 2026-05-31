import type {
  LongTermGoal,
  MoodId,
  RecommendationResult,
} from '../domain/types';
import { MOODS_BY_ID } from '../data/moods';
import { STATE_GOAL_LABELS } from '../domain/explain';
import { ProfileChart } from './ProfileChart';

interface Props {
  result: RecommendationResult;
  selectedMoodIds: MoodId[];
  longTermGoals: LongTermGoal[];
  historyCount: number;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

export function DebugPanel({
  result,
  selectedMoodIds,
  longTermGoals,
  historyCount,
}: Props) {
  const { profile, stateGoal, scoredExercises, excludedExercises } = result;

  const moodLabels =
    selectedMoodIds.length === 0
      ? '—'
      : selectedMoodIds.map((id) => MOODS_BY_ID[id]?.label ?? id).join(', ');

  const evidenceActive = scoredExercises.some(
    (s) => s.breakdown.personalEvidence !== 0,
  );

  return (
    <section className="debug">
      <h2>Transparenz: Wie kam die Empfehlung zustande?</h2>

      {/* --- Plain-language layer --- */}
      <div className="debug-plain">
        <p>
          <strong>Gewählte Zustände:</strong> {moodLabels}
        </p>
        <p>
          <strong>Daraus abgeleitetes Zustandsziel:</strong>{' '}
          {STATE_GOAL_LABELS[stateGoal]}
        </p>
        <p className="hint">
          Aus den Zuständen wird ein Profil berechnet. Daraus leitet sich ein
          Zustandsziel ab. Jede Übung bekommt dann Punkte, je nachdem wie gut
          sie zum Zustandsziel passt, wie sicher und wie gut belegt sie ist.
        </p>
        <ProfileChart profile={profile} />
        <ul className="ranking">
          {scoredExercises.map((s, i) => (
            <li key={s.exercise.id}>
              <span className="rank">{i + 1}.</span> {s.exercise.title}
              <span className="rank-score">{fmt(s.breakdown.finalScore)}</span>
            </li>
          ))}
        </ul>
        {excludedExercises.length > 0 && (
          <div className="excluded-plain">
            <strong>Aus Sicherheitsgründen ausgeschlossen:</strong>
            <ul>
              {excludedExercises.map((e) => (
                <li key={e.exercise.id}>
                  {e.exercise.title} – {e.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* --- Technical detail layer (collapsed) --- */}
      <details className="debug-tech">
        <summary>Technische Details (für Entwickler:innen)</summary>

        <div className="debug-meta">
          <span>
            <strong>Langfristige Ziele:</strong>{' '}
            {longTermGoals.length ? longTermGoals.join(', ') : '—'}
          </span>
          <span>
            <strong>StateGoal (intern):</strong> {stateGoal}
          </span>
          <span>
            <strong>History-Einträge:</strong> {historyCount}
          </span>
        </div>

        <h3 className="subtle-title">Berechnetes Profil</h3>
        <pre>{JSON.stringify(profile, null, 2)}</pre>

        <h3 className="subtle-title">Score-Aufschlüsselung</h3>
        <p className="hint">
          PersonalEvidence zeigt, wie stark die gespeicherte Historie den Score
          verschiebt (0 = zu wenig Daten).
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Übung</th>
                <th>StateFit</th>
                <th>LongTermFit</th>
                <th>PersonalEv.</th>
                <th>Science</th>
                <th>Risk</th>
                <th>Final</th>
              </tr>
            </thead>
            <tbody>
              {scoredExercises.map((s) => (
                <tr key={s.exercise.id}>
                  <td>{s.exercise.title}</td>
                  <td>{fmt(s.breakdown.stateFit)}</td>
                  <td>{fmt(s.breakdown.longTermGoalFit)}</td>
                  <td
                    className={
                      s.breakdown.personalEvidence !== 0
                        ? 'evidence-active'
                        : ''
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
      </details>
    </section>
  );
}
