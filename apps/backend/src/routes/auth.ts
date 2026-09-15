import { Router } from 'express';
import { env, COOKIE_NAME, MAX_PARTICIPANTS } from '../config/env';
import { signSession } from '../utils/jwt';
import { requireAuth } from '../middleware/auth';
import { User } from '../models/User';

const router = Router();

/**
 * POST /api/auth/enter
 * Body: { code: string, name?: string }
 *
 * Validates the shared access code and issues an httpOnly session cookie.
 * Assigns the caller a stable slot ('a' or 'b') within the single room.
 * There can never be more than two identities in the space.
 */
router.post('/enter', async (req, res) => {
  const code = String(req.body?.code ?? '').trim();
  const name = String(req.body?.name ?? '').trim();

  if (!code) {
    return res.status(400).json({ error: 'A code is required.' });
  }
  if (!name) {
    return res.status(400).json({ error: 'Please enter your name.' });
  }
  if (name.length > 40) {
    return res.status(400).json({ error: 'Name must be 40 characters or fewer.' });
  }
  if (code !== env.accessCode) {
    return res.status(401).json({ error: 'That code does not open Only Us.' });
  }

  // Resolve or assign a slot for this person within the room.
  const existing = await User.find({ code }).sort({ slot: 1 }).lean();

  let slot: 'a' | 'b' | null = null;

  // If a user with this name already exists, reuse their identity.
  const byName = existing.find((u) => u.name.toLowerCase() === name.toLowerCase());
  if (byName) {
    slot = byName.slot as 'a' | 'b';
  } else if (existing.length < MAX_PARTICIPANTS) {
    slot = existing.some((u) => u.slot === 'a') ? 'b' : 'a';
    await User.create({ name, code, slot, lastSeenAt: new Date() });
  } else {
    return res
      .status(403)
      .json({ error: 'Only Us is currently limited to two people.' });
  }

  const token = signSession({ roomId: env.roomId, slot, name });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProd, // required for SameSite=None
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return res.json({ ok: true, name, slot, roomId: env.roomId });
});

/** GET /api/auth/me — returns the current session identity, if any. */
router.get('/me', requireAuth, (req, res) => {
  return res.json({ ok: true, ...req.session });
});

/** POST /api/auth/leave — clears the session cookie. */
router.post('/leave', (_req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/',
  });
  return res.json({ ok: true });
});

export default router;
