/**
 * Prints the users stored in MongoDB for the private space.
 * Run from apps/backend:  npm run users
 */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/User';

async function main() {
  await mongoose.connect(env.mongoUri);

  const users = await User.find({}).sort({ slot: 1 }).lean();

  if (users.length === 0) {
    console.log('\nNo users yet. Someone needs to enter the code first.\n');
  } else {
    console.log(`\nUsers in space (code: ${env.accessCode}, room: ${env.roomId}):\n`);
    console.table(
      users.map((u) => ({
        slot: u.slot,
        name: u.name,
        email: u.email || '—',
        bio: u.bio ? u.bio.slice(0, 30) + (u.bio.length > 30 ? '…' : '') : '—',
        avatar: u.avatar ? 'yes' : 'no',
        lastSeen: u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString() : 'never',
      }))
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
