import { API_URL } from './config';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include', // always send the httpOnly session cookie
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export interface Session {
  roomId: string;
  slot: 'a' | 'b';
  name: string;
}

export interface ChatMessage {
  _id: string;
  roomId: string;
  senderSlot: 'a' | 'b';
  senderName: string;
  kind: 'text' | 'gif';
  body: string;
  createdAt: string;
}

export interface Profile {
  slot: 'a' | 'b';
  name: string;
  email?: string;
  bio?: string;
  avatar?: string;
  lastSeenAt?: string | null;
}

export interface ProfileUpdate {
  name: string;
  email?: string;
  bio?: string;
  avatar?: string;
}

export const api = {
  enter: (code: string, name: string) =>
    request<{ ok: true } & Session>('/api/auth/enter', {
      method: 'POST',
      body: JSON.stringify({ code, name }),
    }),

  me: () => request<{ ok: true } & Session>('/api/auth/me'),

  leave: () => request<{ ok: true }>('/api/auth/leave', { method: 'POST' }),

  history: () =>
    request<{ messages: ChatMessage[] }>('/api/messages?limit=100'),

  // ── Profiles ──
  myProfile: () => request<{ profile: Profile }>('/api/profile/me'),

  peerProfile: () => request<{ profile: Profile | null }>('/api/profile/peer'),

  updateProfile: (data: ProfileUpdate) =>
    request<{ ok: true; profile: Profile }>('/api/profile/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
