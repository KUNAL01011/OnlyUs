import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Message } from '../models/Message';

const router = Router();

/**
 * GET /api/messages?before=<iso>&limit=<n>
 * Returns chat history for the caller's room, oldest→newest.
 */
router.get('/', requireAuth, async (req, res) => {
  const roomId = req.session!.roomId;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const before = req.query.before ? new Date(String(req.query.before)) : null;

  const filter: Record<string, unknown> = { roomId };
  if (before && !isNaN(before.getTime())) {
    filter.createdAt = { $lt: before };
  }

  const docs = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // Return in chronological order for easy rendering.
  return res.json({ messages: docs.reverse() });
});

export default router;
