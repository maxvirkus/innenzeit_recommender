import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './_auth.js';
import { EXERCISES } from '../src/data/exercises.js';
import { MOODS } from '../src/data/moods.js';
import { STATE_GOAL_LABELS } from '../src/domain/explain.js';

/**
 * /api/analytics — Auswertung für das Team (Tab „Auswertung“ im Demonstrator).
 *
 *  - GET:  aggregierte Kennzahlen aus session_feedback, chat_transcripts und
 *          user_profile_notes (rein deterministisch, kein LLM).
 *  - POST: qualitative Erkenntnisse — Claude destilliert aus Kommentaren,
 *          Transkripten und Notizen Muster und konkrete Ableitungen.
 */

const INSIGHTS_MODEL = 'claude-haiku-4-5';
/** Max. Transkripte, die in die LLM-Auswertung einfließen. */
const MAX_TRANSCRIPTS_FOR_INSIGHTS = 40;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const titleOf = (id: string | null) =>
  EXERCISES.find((e) => e.id === id)?.title ?? id ?? '–';

interface FeedbackRow {
  created_at: string;
  practice_id: string;
  family: string | null;
  state_goal: string | null;
  selected_mood_ids: string[];
  rating: number | null;
  explanation_clarity: number | null;
  instructions_quality: number | null;
  voice_delivery_quality: number | null;
  comment: string | null;
  better_fit: string | null;
}

interface TranscriptRow {
  created_at: string;
  device_id: string | null;
  messages: { role: string; content: string }[];
  mood_ids: string[];
  state_goal: string | null;
  recommended_id: string | null;
  crisis: boolean;
}

interface NoteRow {
  created_at: string;
  device_id: string;
  note: string;
}

function avg(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number');
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

function groupStats(
  rows: FeedbackRow[],
  key: (r: FeedbackRow) => string | null,
): { name: string; n: number; avgRating: number | null }[] {
  const groups = new Map<string, FeedbackRow[]>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return [...groups.entries()]
    .map(([name, list]) => ({
      name,
      n: list.length,
      avgRating: avg(list.map((r) => r.rating)),
    }))
    .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
}

async function loadData() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const [feedback, transcripts, notes] = await Promise.all([
    supabase
      .from('session_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('chat_transcripts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('user_profile_notes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);
  return {
    feedback: (feedback.data ?? []) as FeedbackRow[],
    transcripts: (transcripts.data ?? []) as TranscriptRow[],
    notes: (notes.data ?? []) as NoteRow[],
  };
}

function buildSummary(data: NonNullable<Awaited<ReturnType<typeof loadData>>>) {
  const { feedback, transcripts, notes } = data;
  const chats = transcripts.filter((t) => t.state_goal !== 'reflection');
  const reflections = transcripts.filter((t) => t.state_goal === 'reflection');

  return {
    feedback: {
      total: feedback.length,
      avgRating: avg(feedback.map((r) => r.rating)),
      avgExplanationClarity: avg(feedback.map((r) => r.explanation_clarity)),
      avgInstructionsQuality: avg(feedback.map((r) => r.instructions_quality)),
      avgVoiceDelivery: avg(feedback.map((r) => r.voice_delivery_quality)),
      ratingDistribution: [1, 2, 3, 4, 5].map(
        (v) => feedback.filter((r) => r.rating === v).length,
      ),
      byPractice: groupStats(feedback, (r) => titleOf(r.practice_id)),
      byFamily: groupStats(feedback, (r) => r.family),
      byStateGoal: groupStats(
        feedback,
        (r) =>
          STATE_GOAL_LABELS[r.state_goal as keyof typeof STATE_GOAL_LABELS] ??
          r.state_goal,
      ),
      // Bewertung je gewählter Stimmung: ein Feedback zählt für jede seiner
      // Stimmungen (Mehrfachauswahl im Mood-Check).
      byMood: groupStats(
        feedback.flatMap((r) =>
          (r.selected_mood_ids ?? []).map((moodId) => ({
            ...r,
            practice_id: moodId,
          })),
        ),
        (r) => MOODS.find((m) => m.id === r.practice_id)?.label ?? r.practice_id,
      ),
      // Welche Übung wurde bei welcher Stimmung wie bewertet (für
      // Zustands-Ableitungen in der LLM-Auswertung).
      moodPracticePairs: feedback.slice(0, 100).map((r) => ({
        moods: (r.selected_mood_ids ?? []).map(
          (id) => MOODS.find((m) => m.id === id)?.label ?? id,
        ),
        practice: titleOf(r.practice_id),
        rating: r.rating,
      })),
      comments: feedback
        .filter((r) => r.comment || r.better_fit)
        .slice(0, 50)
        .map((r) => ({
          created_at: r.created_at,
          practice: titleOf(r.practice_id),
          rating: r.rating,
          comment: r.comment,
          betterFit: r.better_fit,
        })),
    },
    chats: {
      total: chats.length,
      uniqueDevices: new Set(transcripts.map((t) => t.device_id)).size,
      withHandoff: chats.filter((t) => t.recommended_id).length,
      crisis: chats.filter((t) => t.crisis).length,
      reflections: reflections.length,
      avgTurns: avg(chats.map((t) => t.messages?.length ?? 0)),
      topHandoffExercises: groupStats(
        chats
          .filter((t) => t.recommended_id)
          .map((t) => ({ practice_id: t.recommended_id! }) as FeedbackRow),
        (r) => titleOf(r.practice_id),
      ).map(({ name, n }) => ({ name, n })),
      recent: chats.slice(0, 15).map((t) => ({
        created_at: t.created_at,
        moods: t.mood_ids,
        handoff: titleOf(t.recommended_id),
        crisis: t.crisis,
        messages: t.messages,
      })),
    },
    notes: {
      total: notes.length,
      recent: notes.slice(0, 30).map((n) => ({
        created_at: n.created_at,
        device: (n.device_id ?? '').slice(0, 8),
        note: n.note,
      })),
    },
  };
}

const INSIGHTS_PROMPT = `Du bist Produkt-Analyst der Achtsamkeits-App Innenzeit. Du bekommst aggregierte Kennzahlen, Nutzer-Feedback (Bewertungen + Freitext), Chat-Transkripte mit dem LLM-Guide und destillierte Profil-Notizen.

Erstelle eine kompakte Auswertung auf Deutsch (Markdown erlaubt: Überschriften, Listen, Fettung) mit genau diesen Abschnitten:
1. WAS GUT FUNKTIONIERT – belegt mit konkreten Zahlen/Zitaten aus den Daten.
2. SCHMERZPUNKTE – wiederkehrende Beschwerden, schlecht bewertete Übungen/Aspekte, Abbruchmuster in den Chats.
3. THEMEN DER NUTZER – worüber reden sie im Chat (Cluster mit Häufigkeitseindruck).
4. ABLEITUNGEN JE ZUSTAND – nutze die Stimmungs-Bewertungen und die Stimmung↔Übung↔Bewertung-Paare: Welche Übungen/Familien funktionieren für welche Zustände gut oder schlecht? Wo widerspricht das Feedback der aktuellen Empfehlungslogik? Je Zustand 1 Zeile mit Beleg.
5. KONKRETE ABLEITUNGEN – 3–7 priorisierte, umsetzbare Empfehlungen (Produkt, Übungskatalog, Guide-Prompt, Recommender-Gewichte), jeweils mit dem Datenpunkt, der sie begründet.

Regeln: Stütze jede Aussage auf die Daten (zitiere kurz oder nenne Zahlen). Erfinde nichts; bei dünner Datenlage sag das explizit (n nennen). Anonymität wahren (keine Geräte-IDs zitieren).`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return;

  const data = await loadData();
  if (!data) {
    res.status(500).json({ error: 'Supabase ist nicht konfiguriert.' });
    return;
  }
  const summary = buildSummary(data);

  if (req.method === 'GET') {
    res.status(200).json(summary);
    return;
  }

  if (req.method === 'POST') {
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(500).json({ error: 'ANTHROPIC_API_KEY ist nicht konfiguriert' });
      return;
    }
    // Transkripte kompakt serialisieren (Kosten-Deckel).
    const transcriptText = data.transcripts
      .filter((t) => t.state_goal !== 'reflection')
      .slice(0, MAX_TRANSCRIPTS_FOR_INSIGHTS)
      .map((t, i) => {
        const turns = (t.messages ?? [])
          .map((m) => `${m.role === 'user' ? 'Nutzer' : 'Guide'}: ${m.content}`)
          .join('\n');
        return `— Chat ${i + 1} (Stimmungen: ${t.mood_ids.join(', ')}${
          t.crisis ? ', KRISE' : ''
        })\n${turns}`;
      })
      .join('\n\n')
      .slice(0, 60_000);

    try {
      const client = new Anthropic();
      const response = await client.messages.create({
        model: INSIGHTS_MODEL,
        max_tokens: 2000,
        system: [
          {
            type: 'text',
            text: INSIGHTS_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content:
              `KENNZAHLEN:\n${JSON.stringify(
                {
                  feedback: { ...summary.feedback, comments: undefined },
                  chats: { ...summary.chats, recent: undefined },
                },
                null,
                1,
              )}\n\n` +
              `FEEDBACK-KOMMENTARE:\n${JSON.stringify(summary.feedback.comments, null, 1)}\n\n` +
              `PROFIL-NOTIZEN:\n${summary.notes.recent.map((n) => `- ${n.note}`).join('\n') || '(keine)'}\n\n` +
              `CHAT-TRANSKRIPTE:\n${transcriptText || '(keine)'}`,
          },
        ],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();
      res.status(200).json({ insights: text });
    } catch {
      res.status(502).json({ error: 'Auswertung fehlgeschlagen – bitte erneut versuchen.' });
    }
    return;
  }

  res.status(405).json({ error: 'Nur GET oder POST' });
}
