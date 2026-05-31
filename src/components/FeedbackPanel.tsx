import { useState } from 'react';
import type {
  Exercise,
  LongTermGoal,
  MoodId,
  MoodProfile,
  SessionFeedback,
  StateGoal,
} from '../domain/types';
import { listFeedback, submitFeedback, type StoredFeedback } from '../api';

interface Props {
  primary: Exercise | null;
  selectedMoodIds: MoodId[];
  profile: MoodProfile;
  stateGoal: StateGoal;
  longTermGoals: LongTermGoal[];
  /** Number of entries already in the local profile. */
  profileCount: number;
  /** Append to the local profile → personalises future recommendations. */
  onSaveToProfile: (feedback: SessionFeedback) => void;
}

type Rating = 1 | 2 | 3 | 4 | 5;

export function FeedbackPanel({
  primary,
  selectedMoodIds,
  profile,
  stateGoal,
  longTermGoals,
  profileCount,
  onSaveToProfile,
}: Props) {
  const [rating, setRating] = useState<Rating>(4);
  const [profileStatus, setProfileStatus] = useState('');
  const [teamStatus, setTeamStatus] = useState('');
  const [teamFeedback, setTeamFeedback] = useState<StoredFeedback[] | null>(
    null,
  );

  if (!primary) return null;

  const build = (): SessionFeedback => ({
    practiceId: primary.id,
    selectedMoodIds,
    profile,
    stateGoal,
    longTermGoals,
    rating,
    completed: true,
    stoppedEarly: false,
    feltWorse: false,
    timestamp: new Date().toISOString(),
  });

  const saveToProfile = () => {
    onSaveToProfile(build());
    setProfileStatus(
      `Gespeichert. Dein Profil hat jetzt ${profileCount + 1} Bewertung(en) und beeinflusst die Reihenfolge der Empfehlungen.`,
    );
  };

  const sendToTeam = async () => {
    setTeamStatus('Sende…');
    try {
      await submitFeedback(build());
      setTeamStatus('Danke! Dein Feedback wurde ans Team gesendet.');
    } catch (e) {
      setTeamStatus(
        `Senden fehlgeschlagen: ${e instanceof Error ? e.message : 'Fehler'}`,
      );
    }
  };

  const loadTeam = async () => {
    setTeamStatus('Lade gesammeltes Feedback…');
    try {
      const data = await listFeedback();
      setTeamFeedback(data);
      setTeamStatus(`${data.length} Einträge geladen.`);
    } catch (e) {
      setTeamStatus(
        `Laden fehlgeschlagen: ${e instanceof Error ? e.message : 'Fehler'}`,
      );
    }
  };

  const avgTeamRating =
    teamFeedback && teamFeedback.length
      ? (
          teamFeedback.reduce((s, f) => s + f.rating, 0) / teamFeedback.length
        ).toFixed(2)
      : null;

  return (
    <section className="feedback card">
      <h2>Passt die empfohlene Übung?</h2>
      <p className="hint">
        Bewerte, wie gut <strong>{primary.title}</strong> zu dem Zustand passt,
        den du ausgewählt hast – also ob die Empfehlung deiner Erwartung
        entspricht. Die Übung selbst musst du dafür nicht durchführen.
      </p>

      {/* Shared rating input */}
      <label className="field-label" htmlFor="rating">
        Wie gut passt die Empfehlung? (1 = gar nicht, 5 = sehr gut)
      </label>
      <select
        id="rating"
        className="rating-select"
        value={rating}
        onChange={(e) => setRating(Number(e.target.value) as Rating)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      {/* Two clearly separated destinations */}
      <div className="dest-grid">
        <div className="dest">
          <h3 className="dest-title">Mein Profil</h3>
          <p className="dest-text">
            Wird nur in diesem Browser gespeichert. Nach ein paar Bewertungen
            lernt der Recommender, was dir gut tut, und passt die Reihenfolge
            der Vorschläge an dich an.
          </p>
          <button type="button" className="btn ghost" onClick={saveToProfile}>
            Für mein Profil speichern
          </button>
          {profileStatus && <p className="status">{profileStatus}</p>}
        </div>

        <div className="dest">
          <h3 className="dest-title">Team-Feedback</h3>
          <p className="dest-text">
            Wird zentral für euer Team gespeichert, damit ihr den Algorithmus
            gemeinsam auswerten könnt. Beeinflusst deine Empfehlungen nicht.
          </p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={sendToTeam}>
              Ans Team senden
            </button>
            <button type="button" className="btn ghost" onClick={loadTeam}>
              Gesammeltes Feedback ansehen
            </button>
          </div>
          {teamStatus && <p className="status">{teamStatus}</p>}
        </div>
      </div>

      {teamFeedback && (
        <div className="team-feedback">
          <p>
            <strong>{teamFeedback.length}</strong> Einträge
            {avgTeamRating && <> · Ø Bewertung {avgTeamRating}</>}
          </p>
          {teamFeedback.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Übung</th>
                    <th>Zustandsziel</th>
                    <th>Bewertung</th>
                  </tr>
                </thead>
                <tbody>
                  {teamFeedback.map((f, i) => (
                    <tr key={f.id ?? i}>
                      <td>{f.practiceId}</td>
                      <td>{f.stateGoal}</td>
                      <td>{f.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
