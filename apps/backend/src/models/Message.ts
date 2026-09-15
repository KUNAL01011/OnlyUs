import { Schema, model, InferSchemaType } from 'mongoose';

/**
 * A single chat message inside the private room.
 * `kind` distinguishes plain text (which may contain emoji) from a GIF.
 */
const messageSchema = new Schema(
  {
    roomId: { type: String, required: true, index: true },
    // Which of the two participants sent it.
    senderSlot: { type: String, enum: ['a', 'b'], required: true },
    senderName: { type: String, required: true },
    kind: { type: String, enum: ['text', 'gif'], default: 'text' },
    // For text: the message body. For gif: the GIF url.
    body: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

messageSchema.index({ roomId: 1, createdAt: 1 });

export type IMessage = InferSchemaType<typeof messageSchema>;
export const Message = model('Message', messageSchema);
