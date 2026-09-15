# Only Us

> Just you. Just me. **Only Us.**

A private, real-time communication app built for **exactly two people**. Chat with emoji & GIFs, audio/video calls, and screen sharing — all peer-to-peer over WebRTC, with chat history persisted in MongoDB.

Not a SaaS. Not a social network. One private space, two people, one shared code.

---

## Features

- 🔐 **Private access** — enter with a shared 4-digit code (no sign-up, no public rooms)
- 💬 **Real-time 1-to-1 chat** over Socket.IO, persisted to MongoDB
- 😍 **Emoji** picker + **GIF** search (Giphy)
- ⌨️ **Typing indicators** and live **online/offline presence**
- 📞 **Audio & video calls** over WebRTC (media is peer-to-peer, never proxied)
- 🖥️ **Screen sharing** with seamless camera ↔ screen switching
- 🪞 **Self-view** picture-in-picture with mic/camera toggles
- 👥 **Hard 2-person limit** — a third connection is rejected with
  _"Only Us is currently limited to two people."_
- 🍪 Secure **httpOnly cookie** sessions (no tokens in localStorage)
- ⏰ Built-in **keep-alive cron** so a Render free service stays awake

---

## Architecture

```
              Next.js Frontend (Vercel)
                       │
              HTTP + WebSocket (WSS)
                       │
              Node.js Backend (Render)
                       │
          ┌────────────┴────────────┐
          │                         │
      MongoDB Atlas            WebRTC Signaling
     (chat history)                 │
                          User A ⟷ User B  (audio/video/screen)
```

The backend handles **only** signaling (SDP + ICE + call state). Actual
audio/video/screen media flows directly between the two browsers via WebRTC.

**Tech:** Next.js · TypeScript · Tailwind · shadcn-style UI · Lucide · Express ·
Socket.IO · Mongoose · MongoDB · WebRTC (STUN/TURN).

---

## Project structure

This is an **npm-workspaces monorepo**. App code lives under `apps/*`, shared
code under `packages/*`.

```
OnlyUs/
├── apps/
│   ├── backend/             Express + Socket.IO + Mongoose (signaling & chat)
│   │   ├── src/
│   │   │   ├── config/      env + Mongo connection
│   │   │   ├── models/      User (with profile), Message
│   │   │   ├── routes/      auth, messages, profile
│   │   │   ├── socket/      real-time: chat, presence, WebRTC signaling
│   │   │   ├── middleware/  cookie session auth
│   │   │   ├── scripts/     listUsers.ts  → `npm run users`
│   │   │   ├── keepAlive.ts node-cron self-ping
│   │   │   └── index.ts     server entry
│   │   └── .env.example
│   └── frontend/            Next.js App Router
│       ├── app/             entry screen (/) + private space (/space)
│       ├── components/      Chat, CallPanel, ProfileDialog, Avatar, pickers
│       ├── lib/             api, socket, webrtc (CallManager), config
│       └── .env.example
├── packages/
│   ├── shared/              shared utils + zod ProfileSchema (@repo/shared)
│   └── eslint-config/       shared lint config
├── tsconfig.base.json       base TS config the apps extend
├── render.yaml              backend deploy blueprint (rootDir: apps/backend)
└── .github/workflows/       external keep-alive ping
```

---

## Local development

**Prerequisites:** Node 18+, and a MongoDB (local or an Atlas URI).

### 1. Install everything (from the repo root)

```bash
npm install
```

This installs all workspaces at once (root, `apps/*`, `packages/*`).

### 2. Configure env files

```bash
cp apps/backend/.env.example apps/backend/.env    # set ACCESS_CODE, MONGODB_URI, JWT_SECRET
cp apps/frontend/.env.example apps/frontend/.env   # defaults point at http://localhost:4000
```

### 3. Run both apps together (from the repo root)

```bash
npm run dev
```

Or individually: `npm run dev:backend` (http://localhost:4000) and
`npm run dev:frontend` (http://localhost:3000).

Open **http://localhost:3000**, enter the `ACCESS_CODE` from the backend `.env`
(default `1234`), and you're in. To test the two-person experience, open a second
browser (or a private window) and enter the same code with a different name.

### Build (from the repo root)

```bash
npm run build
```

Builds the backend (`tsc`) and the frontend (`next build`).

> **Note on media:** browsers only allow camera/mic/screen capture on
> `localhost` or over HTTPS. Local dev on `localhost` works; on a LAN IP it will
> not — use HTTPS in that case.

---

## Profiles

Each person can edit their own **name, email, bio, and profile photo** from the
gear/avatar button in the header. Everything is saved in MongoDB (the avatar is
stored as a small resized `data:` URL on the `User` document). Changes broadcast
live over the `profile:update` socket event, so the other person sees your new
name/photo immediately.

## See who's in the space

To inspect the stored users (names, emails, which slot, whether they've set an
avatar, last seen) run from the repo root:

```bash
npm run users
```

Or directly against Mongo with `mongosh`:

```bash
mongosh "<your MONGODB_URI>" --eval "db.users.find({}, {name:1, email:1, slot:1, bio:1, lastSeenAt:1}).pretty()"
```

---

## How access works

There is **one** private space identified internally by `ROOM_ID` (default
`only-us`). Both people share a single secret `ACCESS_CODE`. The first person to
enter takes slot **A**, the second takes slot **B** — that's the whole model.
A third distinct person is rejected at both the HTTP and the socket layer
(`MAX_PARTICIPANTS = 2`).

---

## Deployment

### MongoDB — Atlas
1. Create a free cluster and a database user.
2. Allow network access (`0.0.0.0/0` for simplicity, or Render's IPs).
3. Copy the connection string → `MONGODB_URI`.

### Backend — Render

> **What is `render.yaml`?** It's a Render **Blueprint** — a deploy recipe Render
> reads *only in its own dashboard* when you create the service. You never run it
> locally. It tells Render: build from `apps/backend`, run `npm install && npm run
> build`, start with `npm start`, and which env vars to ask you for.

1. Push this repo to GitHub.
2. Render → **New → Blueprint** and select the repo (Render auto-detects
   `render.yaml`). `rootDir` is already set to `apps/backend`.
3. Fill the secret env vars it prompts for: `MONGODB_URI`, `ACCESS_CODE`,
   `CLIENT_ORIGIN` (your Vercel URL), and `PUBLIC_URL` (this service's own URL,
   set after the first deploy). `JWT_SECRET` is auto-generated.
4. Deploy. Health check: `GET /health`.

(You can also skip the Blueprint and create the web service manually: set **Root
Directory** = `apps/backend`, **Build** = `npm install && npm run build`,
**Start** = `npm start`, and add the env vars by hand.)

### Frontend — Vercel
1. Vercel → **New Project** → import the repo.
2. Set **Root Directory** to `apps/frontend`.
3. Env vars:
   - `NEXT_PUBLIC_API_URL` = your Render URL
   - `NEXT_PUBLIC_SOCKET_URL` = same Render URL
   - `NEXT_PUBLIC_STUN_URLS` = `stun:stun.l.google.com:19302`
   - `NEXT_PUBLIC_TURN_URL` / `NEXT_PUBLIC_TURN_USERNAME` /
     `NEXT_PUBLIC_TURN_CREDENTIAL` (for production reliability — see below)
4. Deploy, then set the backend's `CLIENT_ORIGIN` to the Vercel URL and redeploy.

> Cross-domain cookies: in production the backend sends the session cookie with
> `SameSite=None; Secure`, so **both** apps must be served over HTTPS (Vercel and
> Render both are by default).

### TURN for production
STUN alone fails behind symmetric NATs / strict firewalls. Add a TURN relay for
reliable calls. Options: a managed provider (e.g. Twilio, Metered, Cloudflare
Calls) or self-hosted **coturn**. Set the `NEXT_PUBLIC_TURN_*` env vars — the
frontend reads them in `lib/config.ts::getIceServers()`.

---

## Keep-alive (stop Render sleeping)

Render's free web services sleep after ~15 min idle. Two layers are included:

1. **Internal** — the backend runs a `node-cron` job every `KEEPALIVE_MINUTES`
   (default 10) pinging its own `/health`. Configure via `PUBLIC_URL`,
   `KEEPALIVE_MINUTES`, `KEEPALIVE_ENABLED`.
2. **External (recommended)** — a self-ping can't wake an already-sleeping
   instance, so `.github/workflows/keep-alive.yml` pings `/health` every 10 min
   from GitHub Actions. Add a repo secret `BACKEND_URL = https://<your-backend>.onrender.com`.
   (Alternatively use cron-job.org or UptimeRobot pointed at `/health`.)

---

## Real-time event reference

| Event | Direction | Purpose |
|-------|-----------|---------|
| `presence:update` | server → both | who is online (`['a']` / `['a','b']`) |
| `room:joined` | server → socket | confirms slot on connect |
| `room:full` | server → socket | third participant rejected |
| `chat:message` | both | send / receive a message (persisted) |
| `chat:typing` | both | typing indicator |
| `call:invite` / `accept` / `reject` / `end` | both | call lifecycle |
| `webrtc:offer` / `answer` / `ice` | both | WebRTC signaling (relay only) |
| `screen:state` | both | peer started/stopped screen share |
| `profile:update` | server → both | a profile (name/email/bio/avatar) changed |

---

## Security notes

- Sessions are signed JWTs in **httpOnly** cookies — never exposed to JS.
- The socket handshake is authenticated from the same cookie.
- The 2-person cap is enforced server-side, not just in the UI.
- Keep `ACCESS_CODE` and `JWT_SECRET` secret; use a long random `JWT_SECRET`.
- Media is encrypted peer-to-peer by WebRTC (DTLS-SRTP); the server never sees
  audio/video.

---

Made for two. 💜
