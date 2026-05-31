import type { SessionFeedback } from './domain/types';

/**
 * Thin client for the Vercel serverless endpoints. All requests include the
 * session cookie (httpOnly) set by the login endpoint.
 */

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function login(password: string): Promise<void> {
  await postJson('/api/login', { password });
}

export async function checkSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/session', { credentials: 'same-origin' });
    if (!res.ok) return false;
    const data = (await res.json()) as { authenticated?: boolean };
    return Boolean(data.authenticated);
  } catch {
    return false;
  }
}

export async function submitFeedback(
  feedback: SessionFeedback,
): Promise<void> {
  await postJson('/api/feedback', feedback);
}

export interface StoredFeedback extends SessionFeedback {
  id?: string | number;
  created_at?: string;
}

export async function listFeedback(): Promise<StoredFeedback[]> {
  const res = await fetch('/api/feedback', { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = (await res.json()) as { feedback?: StoredFeedback[] };
  return data.feedback ?? [];
}
