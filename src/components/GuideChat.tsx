import { useEffect, useRef, useState } from 'react';
import { track } from '@vercel/analytics/react';
import type {
  MoodId,
  SessionFeedback,
  TimeOfDay,
  UserSettings,
} from '../domain/types';

/**
 * Weg 2 des Flows: Chat mit dem Guide, *nachdem* der Recommender gerechnet
 * hat (siehe docs/chat-guide-konzept.md). Der Server berechnet die
 * Basis-Empfehlung aus denselben Inputs; verfeinert das Gespräch die
 * Empfehlung, kommt ein strukturiertes `recommendation`-Objekt zurück und
 * wird hier als Karte gezeigt.
 */

interface RecommendationPayload {
  exerciseId: string;
  title: string;
  durationMinutes: number;
  description: string;
  stateGoal: string;
  stateGoalLabel: string;
  reasons: string[];
  caution: string | null;
  alternatives: { id: string; title: string; durationMinutes: number }[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  selectedMoodIds: MoodId[];
  timeOfDay: TimeOfDay;
  settings: UserSettings;
  history: SessionFeedback[];
  recentlyServed: string[];
}

function getDeviceId(): string {
  let id = localStorage.getItem('iz_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('iz_device_id', id);
  }
  return id;
}

export function GuideChat({
  selectedMoodIds,
  timeOfDay,
  settings,
  history,
  recentlyServed,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refined, setRefined] = useState<RecommendationPayload | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setError(null);
    setLoading(true);
    if (messages.length === 0) track('guide_chat_started');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          messages: next,
          context: {
            selectedMoodIds,
            timeOfDay,
            userSettings: settings,
            history: history.slice(-5),
            recentlyServed,
            localTime: new Date().toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        recommendation?: RecommendationPayload | null;
        crisis?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? 'Der Guide ist gerade nicht erreichbar.');
        return;
      }
      setMessages([...next, { role: 'assistant', content: data.reply ?? '' }]);
      if (data.recommendation) {
        setRefined(data.recommendation);
        track('guide_chat_refined', { exercise: data.recommendation.exerciseId });
      }
      if (data.crisis) track('guide_chat_crisis');
    } catch {
      setError('Netzwerkfehler – bitte versuch es noch einmal.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="card guide-chat">
        <button
          className="guide-chat-open"
          onClick={() => {
            setOpen(true);
            track('guide_chat_opened');
          }}
        >
          Mit dem Guide besprechen
        </button>
        <p className="guide-chat-hint">
          Ausschütten, die Empfehlung präzisieren oder Fragen dazu stellen. Der
          Guide wählt nie selbst eine Übung – Verfeinerungen laufen erneut durch
          den Recommender.
        </p>
      </div>
    );
  }

  return (
    <div className="card guide-chat">
      <h3>Gespräch mit dem Guide</h3>
      <div className="guide-chat-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <p className="guide-chat-hint">
            Erzähl, was dich gerade beschäftigt – oder sag z.&nbsp;B. „Ich habe
            nur 3 Minuten“.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`guide-chat-bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="guide-chat-bubble assistant">…</div>}
      </div>

      {refined && (
        <div className="guide-chat-refined">
          <p className="meta">Verfeinerte Empfehlung (erneuter Recommender-Lauf)</p>
          <strong>{refined.title}</strong> · {refined.durationMinutes} Min
          <p className="description">{refined.description}</p>
          {refined.reasons.slice(0, 2).map((r) => (
            <div key={r} className="reason">
              {r}
            </div>
          ))}
          {refined.caution && <p className="guide-chat-caution">{refined.caution}</p>}
        </div>
      )}

      {error && <p className="guide-chat-error">{error}</p>}

      <div className="guide-chat-input">
        <input
          type="text"
          value={input}
          maxLength={2000}
          placeholder="Schreib dem Guide …"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
          disabled={loading}
        />
        <button onClick={send} disabled={loading || !input.trim()}>
          Senden
        </button>
      </div>
      <p className="guide-chat-disclaimer">
        Der Guide ist kein Therapie-Ersatz. In Krisen: Telefonseelsorge
        0800&nbsp;111&nbsp;0&nbsp;111 (kostenlos, rund um die Uhr).
      </p>
    </div>
  );
}
