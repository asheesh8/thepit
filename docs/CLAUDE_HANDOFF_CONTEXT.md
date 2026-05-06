# The Pit Handoff Context

This document summarizes what was built in this Codex context so another assistant can continue without losing the thread.

## Project

The Pit is a React/Vite/Supabase trading journal and community app.

Current branch:

- `codex/phase-1-discipline-engine`

Core stack:

- React 19
- Vite
- React Router
- Supabase Auth, Postgres, Storage, and Realtime
- Inline styling plus global variables in `src/index.css`

Run locally:

```powershell
npm run dev -- --host 127.0.0.1
```

Open:

```text
http://localhost:5173
```

Verify:

```powershell
npm run lint
npm run build
```

## SQL Files To Run In Supabase

Run in this order:

1. `docs/supabase/phase-1-discipline-engine.sql`
2. `docs/supabase/phase-2-community-review-engine.sql`
3. `docs/supabase/phase-3-native-live-rooms.sql`

If Supabase schema cache acts stale after SQL changes, run:

```sql
notify pgrst, 'reload schema';
```

## Phase 1: Discipline Engine

Added:

- Strategy Library at `/strategies`
- Strategy detail pages at `/strategies/:id`
- Printable/downloadable strategy poster flow
- Trade contexts: combine, funded, backtest, personal/sim
- Strategy linking on trade entries
- Backtesting hub at `/backtesting`
- Backtest reflections with follow-through tracking
- Pit Streak badges
- Trade and reflection calendar at `/calendar`

Important files:

- `src/lib/discipline.js`
- `src/lib/calendar.js`
- `src/pages/Strategies.jsx`
- `src/pages/StrategyDetail.jsx`
- `src/pages/Backtesting.jsx`
- `src/pages/Calendar.jsx`
- `src/components/BadgeStrip.jsx`
- `src/components/StrategyForm.jsx`
- `src/components/StrategyCard.jsx`
- `src/components/TradeContextPicker.jsx`
- `src/components/StrategySelect.jsx`
- `src/components/CalendarMonth.jsx`
- `src/components/BacktestReflectionComposer.jsx`
- `src/components/BacktestReflectionCard.jsx`

## Phase 2: Community Review Engine

Added:

- Structured callout threads on trade cards
- Callout reasons, body, replies, resolved state
- Rich profile stats strip
- Profile Strategies tab
- Public/private strategy toggle
- Public strategy viewing and cloning
- Community Review page at `/review`

Important files:

- `src/lib/community.js`
- `src/pages/Review.jsx`
- `src/components/CalloutComposer.jsx`
- `src/components/CalloutThreadCard.jsx`
- `src/components/CalloutThreadList.jsx`
- `src/components/ProfileStatsStrip.jsx`
- `src/components/PublicStrategyPanel.jsx`

Important Supabase note:

- Multiple tables point to `profiles`, so embedded selects often need explicit FK names like `profiles!some_constraint_name(...)`.

## Phase 3: Native Live Rooms

Added:

- Room lobby at `/rooms`
- Live room page at `/rooms/:id`
- Native in-app mic/camera joining
- Screenshare button
- WebRTC peer signaling through Supabase Realtime
- Participant tiles and main stage
- Room chat
- Shared room notes
- Follow-through action items
- Shared music/playlist queue deck
- Linked trade/strategy context panel
- Copy invite button
- Mark room complete
- Password-protected rooms
- Active room presence
- Right-side live rooms widget on wide screens
- Auto cleanup of stale live rooms after 3 hours with no active presence

Important files:

- `src/lib/liveRooms.js`
- `src/pages/Rooms.jsx`
- `src/pages/LiveRoom.jsx`
- `src/hooks/useRoomRealtime.js`
- `src/hooks/useWebRTCRoom.js`
- `src/components/RoomCreateForm.jsx`
- `src/components/RoomCard.jsx`
- `src/components/RoomSidebarWidget.jsx`
- `src/components/LiveStage.jsx`
- `src/components/ParticipantTile.jsx`
- `src/components/CallControls.jsx`
- `src/components/RoomContextPanel.jsx`
- `src/components/RoomChat.jsx`
- `src/components/RoomNotes.jsx`
- `src/components/RoomActionItems.jsx`
- `src/components/MusicDeck.jsx`

## Music Deck Behavior

The Music tab inside a live room is now a queue deck.

Supported URLs:

- YouTube videos
- YouTube playlists
- Spotify tracks, albums, and playlists through embeds
- Apple Music songs, albums, and playlists through embeds
- Direct audio URLs like `.mp3`
- Direct video URLs like `.mp4`

There is no cover-image field anymore. The user enters:

- Track/video title
- URL

Queue controls:

- Play current
- Skip
- Clear queue
- Play any queue item
- Move up/down
- Remove

Provider limitation:

- YouTube/Spotify/Apple iframe players cannot be fully play/pause controlled by the app because provider/browser rules block that. The app syncs the current selected item and shows the embedded player.

## Live Room Cleanup

`docs/supabase/phase-3-native-live-rooms.sql` defines:

```sql
public.cleanup_stale_live_rooms()
```

It deletes live rooms older than 3 hours when no `live_room_presence.last_seen` exists within the last 3 hours.

The app calls this RPC when loading:

- `/rooms`
- the global room sidebar widget

Optional true background cleanup is documented in the SQL file using `pg_cron` if the Supabase project has it enabled.

## Current Navigation

Top nav was simplified because it had too many tabs.

Visible main links:

- Floor
- Journal
- Strategies
- Rooms
- + Log Trade
- More

More menu contains:

- Backtest
- Calendar
- Review
- Search
- Connections

## Known Issues / Future Work

- Native WebRTC works as an MVP, but production reliability needs TURN credentials.
- Bundle has a Vite chunk-size warning after live rooms; build still passes.
- Room passwords are stored as plain text right now. For production, hash them or move auth logic server-side.
- `profiles.avatar_url` was added for room bubbles, but the profile edit UI does not yet expose avatar upload/edit.
- Room cleanup is app-triggered unless `pg_cron` is enabled.
- The right-side room widget only shows on wide screens through CSS.

## Recent Git Commits In This Work

- `3518d87` Build Phase 1 discipline engine
- `fe9b933` Build Phase 2 community review engine
- `3084036` Build Phase 3 native live rooms
- `300edca` Polish live room call layout
- `07375c4` Add live room music queue deck
- `aea4e5e` Support playlist embeds in live room music deck
- `af9657c` Add live rooms sidebar and password rooms
- `11790ee` Simplify nav and fix room profile joins

## Personality / Product Direction

The Pit should feel like a disciplined trading desk, not a generic social app.

Design tone:

- dark
- sharp
- direct
- trader-process focused
- accountability over vanity

Avoid:

- overly playful badges
- P&L-only leaderboards
- generic meeting-app UI
- bloated nav

Prefer:

- process stats
- strategy context
- callout review
- backtest reflection
- live rooms centered around actual trades and strategies
