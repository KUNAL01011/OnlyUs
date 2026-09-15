import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: (process.env.NODE_ENV ?? 'development') === 'production',
  port: Number(process.env.PORT ?? 4000),

  // Allow one or more comma-separated origins.
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/only-us'),

  accessCode: required('ACCESS_CODE', '1234'),
  jwtSecret: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
  sessionTtl: process.env.SESSION_TTL ?? '7d',

  roomId: process.env.ROOM_ID ?? 'only-us',

  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,
  keepAliveMinutes: Number(process.env.KEEPALIVE_MINUTES ?? 10),
  keepAliveEnabled: (process.env.KEEPALIVE_ENABLED ?? 'true') === 'true',
};

export const COOKIE_NAME = 'onlyus_session';
export const MAX_PARTICIPANTS = 2;
