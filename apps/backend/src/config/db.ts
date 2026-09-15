import mongoose from 'mongoose';
import { env } from './env';

mongoose.set('strictQuery', true);

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10_000,
    });
    console.log('[db] connected to MongoDB');
  } catch (err) {
    console.error('[db] connection error:', err);
    // Fail fast — the app is useless without persistence.
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('[db] reconnected');
  });
}
