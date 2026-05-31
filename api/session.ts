import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthenticated } from './_auth';

/** GET /api/session — reports whether the caller has a valid session. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ authenticated: isAuthenticated(req) });
}
