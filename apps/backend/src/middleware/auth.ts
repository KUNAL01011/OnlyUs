import { Request, Response, NextFunction } from 'express';
import { COOKIE_NAME } from '../config/env';
import { verifySession, SessionPayload } from '../utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const session = verifySession(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  req.session = session;
  next();
}
