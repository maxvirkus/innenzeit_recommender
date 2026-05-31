import {
  explainAlternative,
  explainScore,
  findScored,
  STATE_GOAL_LABELS,
} from '../domain/explain';
import type { RecommendationResult as Result } from '../domain/types';
import { ProfileChart } from './ProfileChart';

interface Props {
  result: Result;
}

export function RecommendationResult({ result }: Props) {
  const { primary, alternatives, scoredExercises, stateGoal, profile } = result;

  if (!primary) {
    return (
      <div className="empty">
        Keine passende Übung gefunden – bitte Auswahl anpassen.
      </div>
    );
  }

  const primaryScored = findScored(scoredExercises, primary.id);
  const primaryExplanation = primaryScored
    ? explainScore(primaryScored, stateGoal)
    : null;

  return (
    <div className="reco">
      <div className="goal-banner">
        Zustandsziel: <strong>{STATE_GOAL_LABELS[stateGoal]}</strong>
      </div>

      <div className="card profile-card">
        <h3 className="subtle-title">So wurde deine Auswahl gelesen</h3>
        <ProfileChart profile={profile} />
      </div>

      <article className="card primary-card">
        <div className="badge">Empfehlung</div>
        <h3 className="title">{primary.title}</h3>
        <p className="meta">{primary.durationMinutes} Min.</p>
        <p className="description">{primary.description}</p>

        {primaryExplanation && (
          <div className="reason">
            <p className="reason-summary">{primaryExplanation.summary}</p>
            <ul className="factor-list">
              {primaryExplanation.factors.map((f, i) => (
                <li key={i} className={f.positive ? 'pos' : 'neg'}>
                  <span aria-hidden>{f.positive ? '✓' : '!'}</span> {f.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {alternatives.length > 0 && (
        <>
          <h2>Alternativen</h2>
          <div className="alt-grid">
            {alternatives.map((ex) => {
              const altScored = findScored(scoredExercises, ex.id);
              const why =
                altScored && primaryScored
                  ? explainAlternative(altScored, primaryScored, stateGoal)
                  : null;
              return (
                <article key={ex.id} className="card">
                  <h3 className="title">{ex.title}</h3>
                  <p className="meta">{ex.durationMinutes} Min.</p>
                  <p className="description">{ex.description}</p>
                  {why && <p className="alt-reason">{why}</p>}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
