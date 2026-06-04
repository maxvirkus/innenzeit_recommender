import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildSessionCookie } from './_auth.js';

/** POST /api/login — checks the shared password and sets a session cookie. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const expected = process.env.APP_PASSWORD;
  if (!expected || !process.env.SESSION_SECRET) {
    res.status(500).json({ error: 'Server nicht konfiguriert' });
    return;
  }

  const body = (req.body ?? {}) as { password?: string };
  if (typeof body.password !== 'string' || body.password !== expected) {
    res.status(401).json({ error: 'Falsches Passwort' });
    return;
  }

  res.setHeader('Set-Cookie', buildSessionCookie());
  res.status(200).json({ ok: true });
}
