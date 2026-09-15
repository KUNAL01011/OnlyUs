import { z } from "zod";

export * from "./utils/cn";
export * from "./utils/formatDate";
export * from "./utils/slugify";

export const hello = (): string => "Hello from @repo/shared";

/** Slot identifies one of the two people inside the single private space. */
export type Slot = "a" | "b";

const emailField = z
  .string()
  .trim()
  .max(120)
  .refine(
    (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "Enter a valid email"
  )
  .optional();

/** Validation for a profile update coming from the client. */
export const ProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  email: emailField,
  bio: z.string().trim().max(280).optional(),
  // Avatar is a data: URL (client-side resized). Capped to keep Mongo docs small.
  avatar: z.string().max(2_500_000).optional(),
});

export type ProfileInput = z.infer<typeof ProfileSchema>;

/** Shape of a profile as exposed to the other person / the UI. */
export interface PublicProfile {
  slot: Slot;
  name: string;
  email?: string;
  bio?: string;
  avatar?: string | null;
  lastSeenAt?: string | null;
}
