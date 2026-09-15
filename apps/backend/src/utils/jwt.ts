import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface SessionPayload {
  roomId: string;
  slot: 'a' | 'b';
  name: string;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.sessionTtl as any });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as SessionPayload;
    if (!decoded?.roomId || !decoded?.slot) return null;
    return decoded;
  } catch {
    return null;
  }
}
