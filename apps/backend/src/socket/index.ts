import type { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import cookie from 'cookie';
import { env, COOKIE_NAME, MAX_PARTICIPANTS } from '../config/env';
import { verifySession, SessionPayload } from '../utils/jwt';
import { Message } from '../models/Message';
import { User } from '../models/User';

interface AuthedSocket extends Socket {
  session: SessionPayload;
}

/**
 * Tracks the sockets present in the single room, keyed by slot.
 * Enforces that at most two DISTINCT people (slots) are ever present.
 */
const presence = new Map<string, Set<string>>(); // slot -> set of socket ids

function slotsOnline(): Array<'a' | 'b'> {
  return (['a', 'b'] as const).filter((s) => (presence.get(s)?.size ?? 0) > 0);
}

function broadcastPresence(io: Server) {
  const online = slotsOnline();
  io.to(env.roomId).emit('presence:update', {
    online, // e.g. ['a'] or ['a','b']
    count: online.length,
  });
}

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientOrigins,
      credentials: true,
    },
  });

  // ── Authentication: verify the httpOnly session cookie on handshake ──
  io.use((socket, next) => {
    try {
      const raw = socket.handshake.headers.cookie ?? '';
      const parsed = cookie.parse(raw);
      const token =
        parsed[COOKIE_NAME] ||
        (socket.handshake.auth?.token as string | undefined);

      const session = token ? verifySession(token) : null;
      if (!session) return next(new Error('unauthorized'));

      (socket as AuthedSocket).session = session;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { session } = socket as AuthedSocket;
    const { slot, name, roomId } = session;

    // ── Enforce MAX_PARTICIPANTS = 2 (two distinct slots) ──
    const distinctSlots = new Set(slotsOnline());
    if (!distinctSlots.has(slot) && distinctSlots.size >= MAX_PARTICIPANTS) {
      socket.emit('room:full', {
        message: 'Only Us is currently limited to two people.',
      });
      socket.disconnect(true);
      return;
    }

    socket.join(roomId);
    if (!presence.has(slot)) presence.set(slot, new Set());
    presence.get(slot)!.add(socket.id);

    console.log(`[socket] ${name} (${slot}) connected → ${socket.id}`);
    broadcastPresence(io);

    // Tell the newcomer who else is here so a call can begin.
    socket.emit('room:joined', { slot, name, online: slotsOnline() });

    // ─────────────────────────── Chat ───────────────────────────
    socket.on('chat:message', async (payload: { kind?: 'text' | 'gif'; body?: string }, ack?: (m: unknown) => void) => {
      const body = String(payload?.body ?? '').slice(0, 4000).trim();
      const kind = payload?.kind === 'gif' ? 'gif' : 'text';
      if (!body) return;

      const doc = await Message.create({
        roomId,
        senderSlot: slot,
        senderName: name,
        kind,
        body,
      });

      const message = {
        _id: String(doc._id),
        roomId,
        senderSlot: slot,
        senderName: name,
        kind,
        body,
        createdAt: doc.createdAt,
      };

      io.to(roomId).emit('chat:message', message);
      ack?.(message);
    });

    socket.on('chat:typing', (payload: { typing: boolean }) => {
      socket.to(roomId).emit('chat:typing', { slot, typing: !!payload?.typing });
    });

    // ───────────────── WebRTC signaling (relay only) ─────────────────
    // The backend NEVER touches media — it only forwards SDP + ICE.
    socket.on('call:invite', (payload: { mode: 'audio' | 'video' }) => {
      socket.to(roomId).emit('call:invite', { from: slot, name, mode: payload?.mode ?? 'video' });
    });
    socket.on('call:accept', () => socket.to(roomId).emit('call:accept', { from: slot }));
    socket.on('call:reject', () => socket.to(roomId).emit('call:reject', { from: slot }));
    socket.on('call:end', () => socket.to(roomId).emit('call:end', { from: slot }));

    socket.on('webrtc:offer', (payload: { sdp: unknown }) => {
      socket.to(roomId).emit('webrtc:offer', { from: slot, sdp: payload?.sdp });
    });
    socket.on('webrtc:answer', (payload: { sdp: unknown }) => {
      socket.to(roomId).emit('webrtc:answer', { from: slot, sdp: payload?.sdp });
    });
    socket.on('webrtc:ice', (payload: { candidate: unknown }) => {
      socket.to(roomId).emit('webrtc:ice', { from: slot, candidate: payload?.candidate });
    });

    // Screen-share state so the peer can label the incoming track.
    socket.on('screen:state', (payload: { sharing: boolean }) => {
      socket.to(roomId).emit('screen:state', { from: slot, sharing: !!payload?.sharing });
    });

    // ─────────────────────────── Disconnect ───────────────────────────
    socket.on('disconnect', async () => {
      const set = presence.get(slot);
      set?.delete(socket.id);
      if (set && set.size === 0) {
        presence.delete(slot);
        await User.updateOne({ code: env.accessCode, slot }, { lastSeenAt: new Date() }).catch(() => {});
        // Peer should tear down any live call when we fully leave.
        socket.to(roomId).emit('call:end', { from: slot, reason: 'peer-left' });
      }
      console.log(`[socket] ${name} (${slot}) disconnected → ${socket.id}`);
      broadcastPresence(io);
    });
  });

  return io;
}
