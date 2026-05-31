import type { VercelRequest, VercelResponse } from '@vercel/node';

const COOKIE_NAME = 'iz_auth';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** The cookie value a valid session must carry. */
export function sessionToken(): string {
  // SESSION_SECRET is the source of truth; never expose the password itself.
  return process.env.SESSION_SECRET ?? '';
}

/** Builds the Set-Cookie header for a successful login. */
export function buildSessionCookie(): string {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(sessionToken())}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_SECONDS}`,
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

/** Verifies the request carries a valid session cookie. */
export function isAuthenticated(req: VercelRequest): boolean {
  const token = sessionToken();
  if (!token) return false;
  const cookie = req.headers.cookie ?? '';
  const match = cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return false;
  const value = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  return value === token;
}

export function requireAuth(req: VercelRequest, res: VercelResponse): boolean {
  if (isAuthenticated(req)) return true;
  res.status(401).json({ error: 'Nicht authentifiziert' });
  return false;
}
