import cron from 'node-cron';
import { env } from './config/env';

/**
 * Render's free tier puts a web service to sleep after ~15 minutes with no
 * inbound traffic. This internal cron pings the service's own public URL every
 * KEEPALIVE_MINUTES to keep it warm.
 *
 * NOTE: A self-ping only helps while the process is already awake. For a
 * bullet-proof solution also configure an EXTERNAL pinger (cron-job.org, a
 * GitHub Action, UptimeRobot) hitting <PUBLIC_URL>/health — see README.
 */
export function startKeepAlive(): void {
  if (!env.keepAliveEnabled) {
    console.log('[keepalive] disabled');
    return;
  }

  const minutes = Math.max(1, Math.min(env.keepAliveMinutes, 59));
  const expr = `*/${minutes} * * * *`; // every N minutes

  cron.schedule(expr, async () => {
    const url = `${env.publicUrl.replace(/\/$/, '')}/health`;
    try {
      const res = await fetch(url, { method: 'GET' });
      console.log(`[keepalive] pinged ${url} → ${res.status}`);
    } catch (err) {
      console.warn(`[keepalive] ping failed:`, (err as Error).message);
    }
  });

  console.log(`[keepalive] scheduled every ${minutes} min → ${env.publicUrl}/health`);
}
