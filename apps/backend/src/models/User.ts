import { Schema, model, InferSchemaType } from 'mongoose';

/**
 * Only Us has exactly two people. A User document represents one of the two
 * identities inside the single private space. `code` is the shared access
 * code of the space they belong to. The profile fields (email, bio, avatar)
 * are editable by that person and persisted here.
 */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, index: true },
    // Stable identity within the room: 'a' or 'b'.
    slot: { type: String, enum: ['a', 'b'], required: true },

    // ── Editable profile ──
    email: { type: String, trim: true, default: '' },
    bio: { type: String, trim: true, default: '', maxlength: 280 },
    // Avatar stored as a data: URL (client resizes before upload).
    avatar: { type: String, default: '' },

    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ code: 1, slot: 1 }, { unique: true });

export type IUser = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
