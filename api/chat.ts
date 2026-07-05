import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './_auth.js';
import { recommendExercises } from '../src/domain/recommender.js';
import type { RecommenderInput } from '../src/domain/recommender.js';
import { explainScore, STATE_GOAL_LABELS } from '../src/domain/explain.js';
import { MOODS } from '../src/data/moods.js';
import type {
  Exercise,
  MoodId,
  PracticeFamily,
  RecommendationResult,
  SessionFeedback,
  TimeOfDay,
  UserSettings,
} from '../src/domain/types.js';

/**
 * /api/chat — LLM-Guide für den Weg 2 des Flows (siehe
 * docs/chat-guide-konzept.md). Grundprinzipien:
 *
 *  1. Der Chat startet den Flow nie: der Client liefert die explizit gewählten
 *     Zustände mit; der Server berechnet daraus die Basis-Empfehlung.
 *  2. "LLM versteht, Regeln entscheiden": das Modell wählt nie selbst eine
 *     Übung. Es darf nur `verfeinere_empfehlung` aufrufen; der Server führt
 *     dann den deterministischen Recommender erneut aus und filtert nach den
 *     im Gespräch genannten Einschränkungen.
 *
 * v1 antwortet als einfaches JSON (kein SSE) — Antworten sind kurz, Haiku ist
 * schnell; Streaming ist ein späterer Ausbau.
 */

const MODEL = 'claude-haiku-4-5';
const MAX_TOOL_ROUNDS = 3;

// --- Missbrauchsschutz -------------------------------------------------------
// Der API-Key liegt nur serverseitig; diese Limits verhindern, dass jemand mit
// gültiger Auth (oder gestohlenem App-Token) das Token-Budget leerzieht.
/** Maximal mitgeschickte Gesprächs-Turns; ältere werden serverseitig gekappt. */
const MAX_HISTORY_MESSAGES = 30;
/** Maximale Länge einer einzelnen Nachricht (Zeichen). */
const MAX_MESSAGE_CHARS = 2000;
/** Requests pro Gerät und Stunde. */
const DEVICE_LIMIT_PER_HOUR = Number(process.env.CHAT_DEVICE_LIMIT_PER_HOUR ?? 30);
/** Requests insgesamt pro Tag (harter Kosten-Deckel über alle Nutzer). */
const GLOBAL_LIMIT_PER_DAY = Number(process.env.CHAT_GLOBAL_LIMIT_PER_DAY ?? 400);

const MOOD_IDS = MOODS.map((m) => m.id);
const FAMILIES: PracticeFamily[] = [
  'slow_breathing',
  'grounding',
  'attention_focus',
  'self_compassion',
  'body_scan',
  'gratitude',
  'visualization',
  'activation_breathing',
];

// ---------------------------------------------------------------------------
// Request/Response-Formen (Vertrag mit Web-Demonstrator und Flutter-App)
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatContext {
  selectedMoodIds: MoodId[];
  timeOfDay: TimeOfDay;
  userSettings?: UserSettings;
  history?: SessionFeedback[];
  recentlyServed?: string[];
  /** Destillierte Notizen aus früheren Gesprächen (siehe Konzept-Doku). */
  profileNotes?: string[];
  /** Frühere Mood-IDs (vor diesem Check) – für die Reflexion nach dem Mood-Check. */
  moodHistory?: string[];
  /** Lokale Uhrzeit des Nutzers, z. B. "22:41". */
  localTime?: string;
}

interface ChatRequestBody {
  deviceId?: string;
  messages: ChatMessage[];
  context: ChatContext;
  /**
   * 'chat' (Default): Gespräch mit Tools. 'reflection': einmalige, kurze
   * Guide-Reflexion direkt nach dem Mood-Check (kein Tool, keine Übung).
   */
  mode?: 'chat' | 'reflection';
}

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

// ---------------------------------------------------------------------------
// Krisen-Erkennung (serverseitig, unabhängig vom Modell)
// ---------------------------------------------------------------------------

const CRISIS_PATTERN =
  /suizid|umbring|nicht mehr leben|leben (zu )?nehmen|selbstverletz|ritzen|sterben (will|möchte)|keinen ausweg/i;

const CRISIS_REPLY =
  'Danke, dass du das aussprichst – das klingt nach einer sehr schweren Last, ' +
  'und die gehört nicht in eine Übung. Bitte sprich mit Menschen, die dafür da ' +
  'sind: Die Telefonseelsorge ist rund um die Uhr kostenlos erreichbar unter ' +
  '0800 111 0 111 (auch online unter telefonseelsorge.de). Wenn du in akuter ' +
  'Gefahr bist, ruf bitte 112 an. Du musst da nicht alleine durch.';

// ---------------------------------------------------------------------------
// Empfehlung berechnen + verdichten
// ---------------------------------------------------------------------------

interface RefineConstraints {
  maxDurationMinutes?: number;
  excludedExerciseIds?: string[];
  excludedFamilies?: PracticeFamily[];
}

function allowedByConstraints(e: Exercise, c: RefineConstraints): boolean {
  if (c.maxDurationMinutes && e.durationMinutes > c.maxDurationMinutes) return false;
  if (c.excludedExerciseIds?.includes(e.id)) return false;
  if (c.excludedFamilies?.includes(e.family)) return false;
  return true;
}

/**
 * Führt den Recommender aus und wendet die Gesprächs-Einschränkungen auf die
 * bereits sicherheitsgefilterte, sortierte Kandidatenliste an. Die Safety-
 * Filter des Recommenders bleiben dadurch unumgehbar.
 */
function computeRecommendation(
  input: RecommenderInput,
  constraints: RefineConstraints = {},
): { result: RecommendationResult; payload: RecommendationPayload | null } {
  const result = recommendExercises(input);
  const ranked = result.scoredExercises
    .filter((s) => allowedByConstraints(s.exercise, constraints))
    .sort((a, b) => b.score - a.score);

  // Vom Recommender gewählte Primär-Empfehlung bevorzugen, solange sie den
  // Einschränkungen genügt (sie berücksichtigt canBePrimary + Rotation).
  const primaryScored =
    (result.primary && allowedByConstraints(result.primary, constraints)
      ? result.scoredExercises.find((s) => s.exercise.id === result.primary!.id)
      : undefined) ?? ranked[0];

  if (!primaryScored) return { result, payload: null };

  const explanation = explainScore(primaryScored, result.stateGoal);
  const alternatives = ranked
    .filter((s) => s.exercise.id !== primaryScored.exercise.id)
    .slice(0, 2)
    .map((s) => ({
      id: s.exercise.id,
      title: s.exercise.title,
      durationMinutes: s.exercise.durationMinutes,
    }));

  const e = primaryScored.exercise;
  return {
    result,
    payload: {
      exerciseId: e.id,
      title: e.title,
      durationMinutes: e.durationMinutes,
      description: e.description,
      stateGoal: result.stateGoal,
      stateGoalLabel: STATE_GOAL_LABELS[result.stateGoal],
      reasons: [
        explanation.summary,
        ...explanation.factors.filter((f) => f.positive).map((f) => f.label),
      ],
      caution: result.caution,
      alternatives,
    },
  };
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Du bist der „Guide“ der Achtsamkeits-App Innenzeit – ein ruhiger, warmer, wertfreier Begleiter. Du sprichst Deutsch und duzt.

Ablauf-Kontext: Der Nutzer hat seinen Zustand bereits explizit im Mood-Check gewählt. Ein regelbasiertes Empfehlungssystem hat daraus eine Übung berechnet (siehe Kontext). Der Nutzer hat sich entschieden, vor der Übung mit dir zu sprechen.

Deine Aufgaben:
1. ZUHÖREN: Der Nutzer darf sich einfach ausschütten. Halte das Gespräch, spiegle behutsam, dränge nicht zur Übung. Rufe dann kein_vorschlag_noetig auf.
2. PRÄZISIEREN: Ergibt das Gespräch konkrete neue Fakten (wenig Zeit, Abneigung gegen bestimmte Übungen/Kategorien, eine beim Check nicht genannte Stimmung), rufe verfeinere_empfehlung auf.
3. VALIDIEREN: Fragen zur Empfehlung beantwortest du ausschließlich mit den gelieferten Begründungen und Übungsdaten.
4. ÜBERGEBEN: Möchte der Nutzer die Übung beginnen oder sehen („lass uns starten“, „zeig sie mir“, „okay, machen wir das“), rufe verfeinere_empfehlung auf — mit allen im Gespräch genannten Einschränkungen, sonst ohne Parameter. Erst dadurch erscheint beim Nutzer die Übungs-Karte zum Starten; verweise danach kurz auf sie.

Harte Regeln:
- Du wählst NIEMALS selbst eine Übung und erfindest keine Übungen, Wirkungen oder Begründungen. Alles Übungsbezogene kommt aus dem Kontext oder aus Tool-Ergebnissen.
- Du bist kein Therapie-Ersatz: keine Diagnosen, keine Heilversprechen, keine Behandlungsempfehlungen.
- Bei Hinweisen auf akute Krise oder Suizidalität verlässt du die Übungslogik sofort und verweist auf die Telefonseelsorge (0800 111 0 111, kostenlos, rund um die Uhr) und in akuter Gefahr auf die 112.
- Antworte kurz (2–4 Sätze), entschleunigt, ohne Druck. Höchstens eine Frage pro Antwort.
- Reiner Fließtext: kein Markdown, keine Fettung, keine Listen, keine Überschriften, keine Emojis.
- Erwähne die empfohlene Übung nur, wenn der Nutzer danach fragt, das Gespräch natürlich dort ankommt oder er bereit wirkt.`;

/**
 * System-Prompt für die einmalige Reflexion direkt nach dem Mood-Check
 * (ersetzt die statische Client-Schablone „…ähnlich wie letztes Mal“).
 */
const REFLECTION_PROMPT = `Du bist der „Guide“ der Achtsamkeits-App Innenzeit – ruhig, warm, wertfrei. Du sprichst Deutsch und duzt.

Der Nutzer hat gerade im Mood-Check seine Stimmungen gewählt und sieht deine Reflexion auf einem Zwischenscreen, auf dem er NICHT antworten kann – nur weitertippen.

Formuliere GENAU 1–2 kurze Sätze (zusammen höchstens ~30 Wörter):
- Benenne, dass du seine gewählten Stimmungen siehst – warm, konkret, jedes Mal anders formuliert.
- Liegen frühere Stimmungen vor, greife Wandel oder Ähnlichkeit in wenigen Worten auf – ohne Zahlen, ohne Bewertung, ohne Floskeln wie „ähnlich wie letztes Mal“.
- ABSOLUT KEINE Fragen. Keine Aufforderungen, keine Übung, kein Ratschlag, keine Diagnose, kein Markdown. Nur ein ruhiges Gesehen-Werden.`;

/** Eröffnungs-Anweisung, wenn der Client noch keine Nachrichten hat. */
const OPENING_TURN =
  '(Systemhinweis: Der Nutzer hat gerade den Chat geöffnet und noch nichts geschrieben. ' +
  'Eröffne das Gespräch mit einer kurzen, warmen Begrüßung, die konkret auf seine gewählten ' +
  'Stimmungen eingeht, und lade ihn ein zu erzählen. Variiere Wortwahl und Satzbau, ' +
  'keine Standardfloskel. Kein Tool-Aufruf.)';

/** Entfernt Markdown-Reste (Fettung, Kursiv, Code), falls das Modell doch welche produziert. */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1');
}

function contextBlock(ctx: ChatContext, base: RecommendationPayload | null): string {
  const moods = ctx.selectedMoodIds
    .map((id) => MOODS.find((m) => m.id === id)?.label ?? id)
    .join(', ');
  const lines = [
    `Gewählte Stimmungen (Mood-Check): ${moods || 'keine'}`,
    `Tageszeit: ${ctx.timeOfDay}${ctx.localTime ? ` (${ctx.localTime} Uhr)` : ''}`,
  ];
  if (ctx.userSettings) {
    lines.push(
      `Langzeitziele: ${ctx.userSettings.longTermGoals.join(', ') || 'keine'}`,
      `Erfahrung: Atem ${ctx.userSettings.breathworkExperience}, Meditation ${ctx.userSettings.meditationExperience}; Intensität: ${ctx.userSettings.practiceIntensity}`,
    );
  }
  if (ctx.history?.length) {
    const recent = ctx.history.slice(-5).map((h) => {
      const flags = [
        h.rating != null ? `Bewertung ${h.rating}/5` : null,
        h.stoppedEarly ? 'früh abgebrochen' : null,
        h.feltWorse ? 'fühlte sich danach schlechter' : null,
      ]
        .filter(Boolean)
        .join(', ');
      return `- ${h.practiceId}${flags ? ` (${flags})` : ''}`;
    });
    lines.push('Letzte Sessions:', ...recent);
  }
  if (ctx.profileNotes?.length) {
    lines.push('Notizen aus früheren Gesprächen:', ...ctx.profileNotes.map((n) => `- ${n}`));
  }
  if (base) {
    lines.push(
      `Aktuelle Empfehlung (regelbasiert): „${base.title}“ (${base.durationMinutes} Min) – ${base.description}`,
      `Zustandsziel: ${base.stateGoalLabel}`,
      `Begründungen: ${base.reasons.join(' · ')}`,
    );
    if (base.caution) lines.push(`Sicherheitshinweis: ${base.caution}`);
    if (base.alternatives.length) {
      lines.push(
        `Alternativen: ${base.alternatives.map((a) => `${a.title} (${a.durationMinutes} Min)`).join(', ')}`,
      );
    }
  } else {
    lines.push('Aktuell erlaubt der Sicherheitsfilter keine Übungs-Empfehlung.');
  }
  return `Kontext für dieses Gespräch:\n${lines.join('\n')}`;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'verfeinere_empfehlung',
    description:
      'Führt das regelbasierte Empfehlungssystem mit den im Gespräch gewonnenen Einschränkungen erneut aus. Nur aufrufen, wenn der Nutzer konkrete neue Fakten nennt (Zeitlimit, Abneigung, zusätzliche Stimmung). Die gewählten Mood-Check-Stimmungen bleiben immer Ausgangspunkt.',
    input_schema: {
      type: 'object',
      properties: {
        zusatz_stimmungen: {
          type: 'array',
          items: { type: 'string', enum: MOOD_IDS },
          description: 'Im Gespräch deutlich gewordene zusätzliche Stimmungen.',
        },
        max_dauer_minuten: {
          type: 'number',
          description: 'Maximale Übungsdauer in Minuten, falls der Nutzer wenig Zeit hat.',
        },
        ausgeschlossene_uebungen: {
          type: 'array',
          items: { type: 'string' },
          description: 'Übungs-IDs, die der Nutzer ablehnt oder gerade nicht machen kann.',
        },
        ausgeschlossene_kategorien: {
          type: 'array',
          items: { type: 'string', enum: FAMILIES },
          description: 'Übungsfamilien, die der Nutzer ablehnt (z. B. slow_breathing).',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'kein_vorschlag_noetig',
    description:
      'Aufrufen, wenn der Nutzer sich nur ausschütten möchte und gerade keine Übung braucht. Der Client zeigt dann bewusst keine Übungs-Karte.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

// ---------------------------------------------------------------------------
// Transkript-Speicherung (best effort)
// ---------------------------------------------------------------------------

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Zählt jüngste Requests über `chat_transcripts` (jeder Turn erzeugt genau
 * eine Zeile). Liefert eine Nutzer-Meldung, wenn ein Limit erreicht ist.
 * Ohne konfiguriertes Supabase oder bei Zählfehlern: fail-open — Auth und
 * Input-Caps greifen weiterhin.
 */
async function rateLimitMessage(deviceId: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();

    const { count: deviceCount } = await supabase
      .from('chat_transcripts')
      .select('id', { count: 'exact', head: true })
      .eq('device_id', deviceId)
      .gte('created_at', hourAgo);
    if ((deviceCount ?? 0) >= DEVICE_LIMIT_PER_HOUR) {
      return 'Du hast den Guide in der letzten Stunde sehr oft erreicht. Gönn dir eine kleine Pause – in einer Weile geht es weiter.';
    }

    const { count: globalCount } = await supabase
      .from('chat_transcripts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dayAgo);
    if ((globalCount ?? 0) >= GLOBAL_LIMIT_PER_DAY) {
      return 'Der Guide hat sein Tageskontingent erreicht. Morgen ist er wieder für dich da.';
    }
    return null;
  } catch {
    return null;
  }
}

async function storeTranscript(row: {
  device_id: string | null;
  messages: ChatMessage[];
  mood_ids: string[];
  state_goal: string | null;
  recommended_id: string | null;
  crisis: boolean;
}) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('chat_transcripts').insert(row);
  } catch {
    // Speicherung ist best effort – der Chat darf daran nie scheitern.
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Nur POST' });
    return;
  }
  if (!requireAuth(req, res)) return;
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY ist nicht konfiguriert' });
    return;
  }

  const body = req.body as ChatRequestBody;
  if (!Array.isArray(body?.messages) || !body.context?.selectedMoodIds?.length) {
    res.status(400).json({ error: 'messages und context.selectedMoodIds sind erforderlich' });
    return;
  }
  // Leere Nachrichtenliste = Chat wurde gerade geöffnet: der Guide eröffnet
  // selbst (variierend, auf die Stimmungen bezogen).
  const isOpening = body.messages.length === 0;
  if (isOpening) {
    body.messages = [{ role: 'user', content: OPENING_TURN }];
  }

  // Input-Caps: übergroße Einzelnachrichten ablehnen, Listen serverseitig
  // kappen (Kosten-Schutz, unabhängig von den Rate-Limits).
  if (
    body.messages.some(
      (m) => typeof m.content !== 'string' || m.content.length > MAX_MESSAGE_CHARS,
    )
  ) {
    res.status(400).json({
      error: `Nachrichten dürfen höchstens ${MAX_MESSAGE_CHARS} Zeichen lang sein.`,
    });
    return;
  }
  body.messages = body.messages.slice(-MAX_HISTORY_MESSAGES);

  const deviceId = String(body.deviceId ?? 'unbekannt').slice(0, 64);
  const limitMessage = await rateLimitMessage(deviceId);
  if (limitMessage) {
    res.status(429).json({ error: limitMessage });
    return;
  }

  const ctx = body.context;
  ctx.selectedMoodIds = ctx.selectedMoodIds
    .filter((m) => MOOD_IDS.includes(m))
    .slice(0, 3);
  if (ctx.selectedMoodIds.length === 0) {
    res.status(400).json({ error: 'Keine gültigen Stimmungen übergeben.' });
    return;
  }
  ctx.history = ctx.history?.slice(-10);
  ctx.profileNotes = ctx.profileNotes?.slice(0, 20).map((n) => String(n).slice(0, 300));

  // Einmalige Guide-Reflexion nach dem Mood-Check (kein Tool, keine Übung).
  if (body.mode === 'reflection') {
    const previous = (ctx.moodHistory ?? [])
      .filter((m) => MOOD_IDS.includes(m as MoodId))
      .slice(-15);
    const label = (id: string) => MOODS.find((m) => m.id === id)?.label ?? id;
    const moodLabels = ctx.selectedMoodIds.map(label).join(', ');
    const prevLabels = previous.map(label).join(', ');
    try {
      const client = new Anthropic();
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 150,
        system: [
          {
            type: 'text',
            text: REFLECTION_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content:
              `Gewählte Stimmungen: ${moodLabels}.\n` +
              (prevLabels
                ? `Frühere Stimmungen (letzte Sessions, chronologisch): ${prevLabels}.`
                : 'Keine früheren Sessions bekannt – vermutlich der erste Besuch.') +
              `\nTageszeit: ${ctx.timeOfDay}${ctx.localTime ? ` (${ctx.localTime} Uhr)` : ''}.`,
          },
        ],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();
      const reply =
        stripMarkdown(text) || 'Schön, dass du da bist. Nimm dir einen Moment, um anzukommen.';
      await storeTranscript({
        device_id: deviceId,
        messages: [{ role: 'assistant', content: reply }],
        mood_ids: ctx.selectedMoodIds,
        state_goal: 'reflection',
        recommended_id: null,
        crisis: false,
      });
      res.status(200).json({ reply, recommendation: null, ventingOnly: false, crisis: false });
    } catch {
      res.status(502).json({
        error: 'Der Guide ist gerade nicht erreichbar. Versuch es gleich noch einmal.',
      });
    }
    return;
  }

  const lastUser = [...body.messages].reverse().find((m) => m.role === 'user');

  const baseInput: RecommenderInput = {
    selectedMoodIds: ctx.selectedMoodIds,
    timeOfDay: ctx.timeOfDay ?? 'midday',
    userSettings: ctx.userSettings,
    history: ctx.history ?? [],
    recentlyServed: ctx.recentlyServed ?? [],
  };
  const base = computeRecommendation(baseInput);

  // Krisenfall: deterministisch, ohne Modell.
  if (lastUser && CRISIS_PATTERN.test(lastUser.content)) {
    await storeTranscript({
      device_id: deviceId,
      messages: [...body.messages, { role: 'assistant', content: CRISIS_REPLY }],
      mood_ids: ctx.selectedMoodIds,
      state_goal: base.result.stateGoal,
      recommended_id: null,
      crisis: true,
    });
    res.status(200).json({ reply: CRISIS_REPLY, recommendation: null, crisis: true });
    return;
  }

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let recommendation: RecommendationPayload | null = null;
  let ventingOnly = false;
  let reply = '';

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
          { type: 'text', text: contextBlock(ctx, base.payload) },
        ],
        tools: TOOLS,
        tool_choice: { type: 'auto', disable_parallel_tool_use: true },
        messages,
      });

      const toolUse = response.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();
      if (text) reply = stripMarkdown(text);

      if (!toolUse || round === MAX_TOOL_ROUNDS) break;

      messages.push({ role: 'assistant', content: response.content });

      let toolResult: string;
      if (toolUse.name === 'kein_vorschlag_noetig') {
        ventingOnly = true;
        recommendation = null;
        toolResult =
          'Verstanden – keine Übungs-Karte. Bleib beim Zuhören; biete nichts aktiv an.';
      } else {
        const input = toolUse.input as {
          zusatz_stimmungen?: MoodId[];
          max_dauer_minuten?: number;
          ausgeschlossene_uebungen?: string[];
          ausgeschlossene_kategorien?: PracticeFamily[];
        };
        const moodSet = new Set<MoodId>(ctx.selectedMoodIds);
        for (const m of input.zusatz_stimmungen ?? []) {
          if (MOOD_IDS.includes(m)) moodSet.add(m);
        }
        const refined = computeRecommendation(
          { ...baseInput, selectedMoodIds: [...moodSet] },
          {
            maxDurationMinutes: input.max_dauer_minuten,
            excludedExerciseIds: input.ausgeschlossene_uebungen,
            excludedFamilies: input.ausgeschlossene_kategorien,
          },
        );
        recommendation = refined.payload;
        ventingOnly = false;
        toolResult = refined.payload
          ? JSON.stringify({
              empfehlung: refined.payload.title,
              dauerMinuten: refined.payload.durationMinutes,
              beschreibung: refined.payload.description,
              zustandsziel: refined.payload.stateGoalLabel,
              begruendungen: refined.payload.reasons,
              sicherheitshinweis: refined.payload.caution,
              alternativen: refined.payload.alternatives,
            })
          : 'Mit diesen Einschränkungen bleibt keine passende Übung übrig. Sag das ehrlich und biete an, eine Einschränkung zu lockern.';
      }

      messages.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: toolResult }],
      });
    }
  } catch (error) {
    const status = error instanceof Anthropic.APIError ? (error.status ?? 502) : 502;
    res.status(status === 429 ? 429 : 502).json({
      error: 'Der Guide ist gerade nicht erreichbar. Versuch es gleich noch einmal.',
    });
    return;
  }

  if (!reply) {
    reply = 'Ich bin hier und höre zu. Magst du erzählen, was dich gerade beschäftigt?';
  }

  await storeTranscript({
    device_id: deviceId,
    messages: [
      ...(isOpening ? [] : body.messages),
      { role: 'assistant' as const, content: reply },
    ],
    mood_ids: ctx.selectedMoodIds,
    state_goal: base.result.stateGoal,
    recommended_id: recommendation?.exerciseId ?? null,
    crisis: false,
  });

  res.status(200).json({ reply, recommendation, ventingOnly, crisis: false });
}
