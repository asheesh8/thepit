# THE PIT

A trading journal and community built for futures traders who actually want to get better.

Log trades. Face the truth. Get real feedback from people who've felt the same pain.

---

## What it is

The Pit is a full-stack web app (PWA + iOS via Capacitor) where traders can:

- **Journal** every trade with reflection, mindset rating, and chart uploads
- **Backtest** strategies and log what you actually learned from each batch
- **Review** other traders' public trades and drop callouts — late entry, emotional trade, clean execution, all of it
- **DM / Group Chat** your mutuals — direct messages and group threads with built-in voice/cam calls and screenshare via WebRTC
- **Track the Vault** — prop firm accounts, drawdown gauges, payouts, fees
- **Build a Strategy Library** — write out your full playbook, make it public, let others clone it
- **Daily check-in gate** — every session starts with a quick honesty check before you see the floor
- **Pit Boss** — AI roast of your trade reflection, powered by Claude (Anthropic)
- **The Floor** — public feed of trades, posts, and backtest reflections from everyone

---

## Stack

| Layer    | Tech                                              |
|----------|---------------------------------------------------|
| Frontend | React 19, React Router 7, Vite                    |
| Backend  | Supabase (Postgres, Auth, Realtime, Storage)      |
| WebRTC   | Native browser APIs via Supabase Realtime signals |
| 3D       | Three.js, React Three Fiber, Drei                 |
| Mobile   | Capacitor (iOS)                                   |
| Deploy   | Vercel                                            |

---

## Getting started

### 1. Clone and install

```bash
git clone <repo-url>
cd thepit
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable               | Where to get it                                        |
|------------------------|--------------------------------------------------------|
| `VITE_SUPABASE_URL`    | Supabase > Settings > API > Project URL                |
| `VITE_SUPABASE_ANON_KEY` | Supabase > Settings > API > anon/public key          |
| `VITE_ANTHROPIC_KEY`   | console.anthropic.com > API Keys (for Pit Boss feature) |

### 3. Set up Supabase

**Fresh project (or after a wipe)** — go to Supabase > SQL Editor and run `docs/supabase/schema.sql`. That one file creates every table, index, RLS policy, and realtime subscription. Fully idempotent — safe to re-run.

**If you need to wipe first**, run this in the SQL Editor before the schema:

```sql
drop table if exists public.payouts cascade;
drop table if exists public.prop_accounts cascade;
drop table if exists public.live_room_presence cascade;
drop table if exists public.live_room_action_items cascade;
drop table if exists public.live_room_messages cascade;
drop table if exists public.live_room_members cascade;
drop table if exists public.live_rooms cascade;
drop table if exists public.pinned_rules cascade;
drop table if exists public.daily_checkins cascade;
drop table if exists public.callout_replies cascade;
drop table if exists public.callout_threads cascade;
drop table if exists public.user_badges cascade;
drop table if exists public.backtest_reflections cascade;
drop table if exists public.post_reactions cascade;
drop table if exists public.posts cascade;
drop table if exists public.reactions cascade;
drop table if exists public.entries cascade;
drop table if exists public.strategies cascade;
drop table if exists public.follows cascade;
drop table if exists public.profiles cascade;
drop function if exists public.cleanup_stale_live_rooms cascade;
```

Then run `docs/supabase/schema.sql` right after.

Then go to **Supabase > Storage** and create two public buckets:

- `avatars` — profile photos
- `charts` — trade chart images and post media

For each bucket, add two policies:
- Allow public read → `SELECT`, condition: `true`
- Allow auth uploads → `INSERT`, condition: `auth.role() = 'authenticated'`

### 4. Run locally

```bash
npm run dev
```

Opens at `http://localhost:5173`.

---

## Project structure

```
src/
├── App.jsx                 # routes + auth gate
├── main.jsx
├── index.css               # global CSS variables and base styles
├── config/
│   └── features.js         # "What's New" modal content — edit this to update it
├── pages/                  # one file per route
│   ├── Landing.jsx
│   ├── Auth.jsx
│   ├── Feed.jsx
│   ├── GuestFeed.jsx
│   ├── Journal.jsx
│   ├── NewEntry.jsx
│   ├── Profile.jsx
│   ├── Search.jsx
│   ├── Connections.jsx
│   ├── Strategies.jsx
│   ├── StrategyDetail.jsx
│   ├── Backtesting.jsx
│   ├── Calendar.jsx
│   ├── Review.jsx
│   ├── Rooms.jsx           # DMs + group chats hub
│   ├── LiveRoom.jsx        # open floor / strategy rooms
│   ├── Vault.jsx
│   └── AccountSettings.jsx
├── components/             # reusable UI pieces
├── hooks/                  # useWebRTCRoom, useRoomRealtime, useTheme
└── lib/                    # supabase client, discipline, community, calendar utils

docs/
└── supabase/
    └── schema.sql          # full database schema — run this on a clean project

public/                     # static assets, PWA manifest, 3D models
```

---

## Features config

To update the "What's New" modal that shows on first visit, edit one file:

```
src/config/features.js
```

Bump `FEATURES_VERSION` to any new string and update the `NEW_FEATURES` array. The modal will show again for all users on next visit.

---

## Deploy

The app is configured for Vercel out of the box (`vercel.json` handles SPA routing and the ForexFactory calendar proxy). Just connect the repo, add your three env vars, and deploy.

For iOS: run `npm run build && npx cap sync` then open `ios/` in Xcode.

---

## Database

Every table is in `docs/supabase/schema.sql`. Here's what exists:

| Table                    | What it stores                              |
|--------------------------|---------------------------------------------|
| `profiles`               | User accounts (mirrors auth.users)          |
| `follows`                | Follow graph                                |
| `entries`                | Trade journal entries                       |
| `reactions`              | Props / callouts on entries                 |
| `posts`                  | Free-text floor posts with optional media   |
| `post_reactions`         | Props / callouts on posts                   |
| `strategies`             | Strategy playbooks                          |
| `backtest_reflections`   | Backtest batch write-ups                    |
| `user_badges`            | Earned streak and discipline badges         |
| `callout_threads`        | Structured callout threads on entries       |
| `callout_replies`        | Replies inside callout threads              |
| `daily_checkins`         | Daily check-in gate responses               |
| `pinned_rules`           | Per-user trading rules pinned to pages      |
| `live_rooms`             | DM threads, group chats, and open rooms     |
| `live_room_members`      | Group chat membership                       |
| `live_room_messages`     | Chat messages in any room                   |
| `live_room_action_items` | Action items inside open rooms              |
| `live_room_presence`     | WebRTC presence for open floor rooms        |
| `prop_accounts`          | Prop firm account tracking (Vault)          |
| `payouts`                | Payout and fee history (Vault)              |
