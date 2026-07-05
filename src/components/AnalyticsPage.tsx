import { useEffect, useState } from 'react';
import { track } from '@vercel/analytics/react';

/**
 * Tab „Auswertung“: aggregierte Kennzahlen aus Feedback, Chat-Transkripten und
 * Profil-Notizen (GET /api/analytics) plus LLM-destillierte Erkenntnisse
 * (POST /api/analytics).
 */

interface GroupStat {
  name: string;
  n: number;
  avgRating: number | null;
}

interface Summary {
  feedback: {
    total: number;
    avgRating: number | null;
    avgExplanationClarity: number | null;
    avgInstructionsQuality: number | null;
    avgVoiceDelivery: number | null;
    ratingDistribution: number[];
    byPractice: GroupStat[];
    byFamily: GroupStat[];
    byStateGoal: GroupStat[];
    comments: {
      created_at: string;
      practice: string;
      rating: number | null;
      comment: string | null;
      betterFit: string | null;
    }[];
  };
  chats: {
    total: number;
    uniqueDevices: number;
    withHandoff: number;
    crisis: number;
    reflections: number;
    avgTurns: number | null;
    topHandoffExercises: { name: string; n: number }[];
    recent: {
      created_at: string;
      moods: string[];
      handoff: string;
      crisis: boolean;
      messages: { role: string; content: string }[];
    }[];
  };
  notes: {
    total: number;
    recent: { created_at: string; device: string; note: string }[];
  };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="analytics-stat">
      <div className="analytics-stat-value">{value}</div>
      <div className="analytics-stat-label">{label}</div>
    </div>
  );
}

function GroupTable({ title, rows }: { title: string; rows: GroupStat[] }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.avgRating ?? 0), 1);
  return (
    <div className="card">
      <h3>{title}</h3>
      <table className="analytics-table">
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td className="num">{r.n}×</td>
              <td className="bar-cell">
                {r.avgRating != null && (
                  <div
                    className="bar"
                    style={{ width: `${(r.avgRating / max) * 100}%` }}
                  />
                )}
              </td>
              <td className="num">{r.avgRating ?? '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openChat, setOpenChat] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Fehler');
        setData(await r.json());
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function generateInsights() {
    setBusy(true);
    setInsights(null);
    track('analytics_insights_requested');
    try {
      const r = await fetch('/api/analytics', { method: 'POST' });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? 'Fehler');
      setInsights(body.insights);
    } catch (e) {
      setInsights(`Fehler: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="empty">Auswertung nicht verfügbar: {error}</div>;
  if (!data) return <div className="empty">Lade Auswertung …</div>;

  const f = data.feedback;
  const c = data.chats;

  return (
    <div className="analytics">
      <header className="app-header">
        <h1>Auswertung</h1>
        <p className="intro">
          Gesammeltes Feedback, Chat-Transkripte und Profil-Notizen – Zahlen
          deterministisch aggregiert, Erkenntnisse per Claude destilliert.
        </p>
      </header>

      <div className="card">
        <h3>Überblick</h3>
        <div className="analytics-stats">
          <Stat label="Feedback-Einträge" value={f.total} />
          <Stat label="Ø Bewertung" value={f.avgRating ?? '–'} />
          <Stat label="Ø Erklärungs-Klarheit" value={f.avgExplanationClarity ?? '–'} />
          <Stat label="Ø Anleitungs-Qualität" value={f.avgInstructionsQuality ?? '–'} />
          <Stat label="Ø Stimme/Betonung" value={f.avgVoiceDelivery ?? '–'} />
          <Stat label="Chats" value={c.total} />
          <Stat label="… mit Übungs-Übergabe" value={c.withHandoff} />
          <Stat label="Ø Turns pro Chat" value={c.avgTurns ?? '–'} />
          <Stat label="Reflexionen" value={c.reflections} />
          <Stat label="Geräte" value={c.uniqueDevices} />
          <Stat label="Krisenfälle" value={c.crisis} />
          <Stat label="Profil-Notizen" value={data.notes.total} />
        </div>
        <p className="analytics-hint">
          Bewertungsverteilung (1–5):{' '}
          {f.ratingDistribution.map((n, i) => `${i + 1}★ ${n}`).join(' · ')}
        </p>
      </div>

      <div className="card analytics-insights">
        <h3>Erkenntnisse (Claude)</h3>
        <button onClick={generateInsights} disabled={busy}>
          {busy ? 'Analysiere …' : 'Erkenntnisse generieren'}
        </button>
        {insights && <pre className="analytics-insights-text">{insights}</pre>}
      </div>

      <GroupTable title="Bewertung je Übung" rows={f.byPractice} />
      <GroupTable title="Bewertung je Übungsfamilie" rows={f.byFamily} />
      <GroupTable title="Bewertung je Zustandsziel" rows={f.byStateGoal} />

      {c.topHandoffExercises.length > 0 && (
        <div className="card">
          <h3>Übergebene Übungen aus dem Chat</h3>
          <table className="analytics-table">
            <tbody>
              {c.topHandoffExercises.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td className="num">{r.n}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {f.comments.length > 0 && (
        <div className="card">
          <h3>Freitext-Feedback</h3>
          {f.comments.map((cm, i) => (
            <div key={i} className="analytics-comment">
              <span className="meta">
                {new Date(cm.created_at).toLocaleDateString('de-DE')} ·{' '}
                {cm.practice} · {cm.rating ?? '–'}★
              </span>
              {cm.comment && <p>{cm.comment}</p>}
              {cm.betterFit && <p className="better-fit">Besser gepasst hätte: {cm.betterFit}</p>}
            </div>
          ))}
        </div>
      )}

      {c.recent.length > 0 && (
        <div className="card">
          <h3>Letzte Chats</h3>
          {c.recent.map((t, i) => (
            <div key={i} className="analytics-chat">
              <button
                className="analytics-chat-head"
                onClick={() => setOpenChat(openChat === i ? null : i)}
              >
                {new Date(t.created_at).toLocaleString('de-DE')} · Stimmungen:{' '}
                {t.moods.join(', ')} · Übergabe: {t.handoff}
                {t.crisis ? ' · ⚠️ Krise' : ''} · {t.messages.length} Turns
              </button>
              {openChat === i && (
                <div className="analytics-chat-body">
                  {t.messages.map((m, j) => (
                    <p key={j} className={m.role}>
                      <strong>{m.role === 'user' ? 'Nutzer' : 'Guide'}:</strong>{' '}
                      {m.content}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {data.notes.recent.length > 0 && (
        <div className="card">
          <h3>Profil-Notizen</h3>
          {data.notes.recent.map((n, i) => (
            <p key={i} className="analytics-note">
              <span className="meta">{n.device}…</span> {n.note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
