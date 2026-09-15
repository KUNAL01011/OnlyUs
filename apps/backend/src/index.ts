import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { connectDB } from './config/db';
import { initSocket } from './socket';
import { startKeepAlive } from './keepAlive';
import authRoutes from './routes/auth';
import messageRoutes from './routes/messages';
import profileRoutes from './routes/profile';

async function main() {
  await connectDB();

  const app = express();

  app.use(
    cors({
      origin: env.clientOrigins,
      credentials: true,
    })
  );
  // Raised limit so avatar data URLs fit in a profile update.
  app.use(express.json({ limit: '4mb' }));
  app.use(cookieParser());

  // Health check — also used by the keep-alive cron and external pingers.
  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'only-us', uptime: process.uptime(), ts: Date.now() });
  });

  app.get('/', (_req, res) => {
    res.json({ name: 'Only Us API', status: 'alive' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/profile', profileRoutes);

  const server = http.createServer(app);
  const io = initSocket(server);
  // Make the Socket.IO server reachable from routes (for profile broadcasts).
  app.set('io', io);

  server.listen(env.port, () => {
    console.log(`\n  Only Us backend listening on :${env.port} (${env.nodeEnv})`);
    console.log(`  Allowed origins: ${env.clientOrigins.join(', ')}\n`);
    startKeepAlive();
  });
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
