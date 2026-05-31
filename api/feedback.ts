import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './_auth';

const TABLE = 'session_feedback';

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * /api/feedback
 *  - POST: stores one SessionFeedback entry (auth required)
 *  - GET:  lists stored feedback for evaluation (auth required)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (!requireAuth(req, res)) return;

  const supabase = getClient();
  if (!supabase) {
    res.status(500).json({ error: 'Supabase nicht konfiguriert' });
    return;
  }

  if (req.method === 'POST') {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const row = {
      practice_id: b.practiceId,
      selected_mood_ids: b.selectedMoodIds ?? [],
      profile: b.profile ?? {},
      state_goal: b.stateGoal,
      long_term_goals: b.longTermGoals ?? [],
      rating: b.rating,
      completed: b.completed ?? false,
      stopped_early: b.stoppedEarly ?? false,
      felt_worse: b.feltWorse ?? false,
      client_timestamp: b.timestamp ?? new Date().toISOString(),
    };

    const { error } = await supabase.from(TABLE).insert(row);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json({ ok: true });
    return;
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    // Map snake_case rows back to the client SessionFeedback shape.
    const feedback = (data ?? []).map((r) => ({
      id: r.id,
      created_at: r.created_at,
      practiceId: r.practice_id,
      selectedMoodIds: r.selected_mood_ids,
      profile: r.profile,
      stateGoal: r.state_goal,
      longTermGoals: r.long_term_goals,
      rating: r.rating,
      completed: r.completed,
      stoppedEarly: r.stopped_early,
      feltWorse: r.felt_worse,
      timestamp: r.client_timestamp,
    }));
    res.status(200).json({ feedback });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
