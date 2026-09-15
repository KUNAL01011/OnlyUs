import { Router } from 'express';
import type { Server as IOServer } from 'socket.io';
import { env } from '../config/env';
import { requireAuth } from '../middleware/auth';
import { User, IUser } from '../models/User';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shape a user document into the profile exposed to the UI / the other person. */
function toPublicProfile(u: Partial<IUser> & { slot: 'a' | 'b'; name: string }) {
  return {
    slot: u.slot,
    name: u.name,
    email: u.email ?? '',
    bio: u.bio ?? '',
    avatar: u.avatar ?? '',
    lastSeenAt: u.lastSeenAt ?? null,
  };
}

/** GET /api/profile/me — the caller's own profile. */
router.get('/me', requireAuth, async (req, res) => {
  const { slot, name } = req.session!;
  const user = await User.findOne({ code: env.accessCode, slot }).lean();
  return res.json({ profile: toPublicProfile(user ?? { slot, name }) });
});

/** GET /api/profile/peer — the OTHER person's profile (may not exist yet). */
router.get('/peer', requireAuth, async (req, res) => {
  const otherSlot = req.session!.slot === 'a' ? 'b' : 'a';
  const user = await User.findOne({ code: env.accessCode, slot: otherSlot }).lean();
  return res.json({ profile: user ? toPublicProfile(user) : null });
});

/**
 * PUT /api/profile/me — update the caller's profile.
 * Body: { name, email?, bio?, avatar? }  (avatar is a data: URL, may be '')
 * Broadcasts `profile:update` so the other person sees changes in real time.
 */
router.put('/me', requireAuth, async (req, res) => {
  const { slot } = req.session!;

  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim();
  const bio = String(req.body?.bio ?? '').trim();
  const avatar = typeof req.body?.avatar === 'string' ? req.body.avatar : undefined;

  if (!name || name.length > 40) {
    return res.status(400).json({ error: 'Name is required (max 40 characters).' });
  }
  if (email && !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email.' });
  }
  if (bio.length > 280) {
    return res.status(400).json({ error: 'Bio must be 280 characters or fewer.' });
  }
  if (avatar && avatar.length > 2_500_000) {
    return res.status(413).json({ error: 'That image is too large. Please pick a smaller one.' });
  }
  if (avatar && avatar !== '' && !avatar.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Invalid image.' });
  }

  const update: Record<string, unknown> = { name, email, bio };
  if (avatar !== undefined) update.avatar = avatar;

  const user = await User.findOneAndUpdate(
    { code: env.accessCode, slot },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const profile = toPublicProfile(user!);

  // Live-notify both people (the editor updates optimistically; the peer via this).
  const io = req.app.get('io') as IOServer | undefined;
  io?.to(env.roomId).emit('profile:update', profile);

  return res.json({ ok: true, profile });
});

export default router;
