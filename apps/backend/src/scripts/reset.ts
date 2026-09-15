/**
 * Resets the private space so the two slots (A/B) are free again.
 *
 *   npm run reset            → clears USERS only (chat history is kept)
 *   npm run reset -- --all   → clears users AND all chat messages
 */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/User';
import { Message } from '../models/Message';

async function main() {
  const alsoMessages = process.argv.includes('--all');

  await mongoose.connect(env.mongoUri);

  const users = await User.deleteMany({});
  console.log(`\nRemoved ${users.deletedCount} user(s). Both slots are now free.`);

  if (alsoMessages) {
    const msgs = await Message.deleteMany({});
    console.log(`Removed ${msgs.deletedCount} message(s).`);
  } else {
    console.log('(Chat history kept. Use "npm run reset -- --all" to clear it too.)');
  }

  await mongoose.disconnect();
  console.log('Done.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
