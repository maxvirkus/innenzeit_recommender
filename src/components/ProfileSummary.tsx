import { useState } from 'react';
import type { SessionFeedback } from '../domain/types';

interface Props {
  history: SessionFeedback[];
  onReset: () => void;
}

/**
 * Always-visible summary of the local user profile. The profile is simply the
 * list of saved ratings in this browser; it personalises the recommendation
 * ranking once enough entries exist.
 */
export function ProfileSummary({ history, onReset }: Props) {
  const [confirming, setConfirming] = useState(false);

  const count = history.length;
  // Personal evidence needs at least 3 relevant entries to take effect.
  const active = count >= 3;

  return (
    <section className="card profile-summary">
      <h2>Mein Profil</h2>
      <p className="hint">
        Dein Profil entsteht automatisch, wenn du Bewertungen „für mein Profil“
        speicherst. Es liegt nur in diesem Browser. Ab 3 gespeicherten
        Bewertungen zu einer Situation fließt es in die Empfehlungen ein.
      </p>

      <div className="profile-status-row">
        <span className="profile-count">
          {count === 0
            ? 'Noch keine Bewertungen gespeichert.'
            : `${count} Bewertung(en) gespeichert`}
        </span>
        <span className={`profile-flag ${active ? 'on' : 'off'}`}>
          {active
            ? 'Personalisierung aktiv'
            : 'Personalisierung noch nicht aktiv'}
        </span>
      </div>

      {count > 0 &&
        (confirming ? (
          <div className="confirm-row">
            <span>Wirklich alle gespeicherten Bewertungen löschen?</span>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                onReset();
                setConfirming(false);
              }}
            >
              Ja, Profil zurücksetzen
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setConfirming(false)}
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn ghost"
            onClick={() => setConfirming(true)}
          >
            Profil zurücksetzen
          </button>
        ))}
    </section>
  );
}
