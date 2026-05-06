# The Pit Phase 3: Native Live Rooms Design

## Summary

Phase 3 brings live trading review rooms directly into The Pit. Users can create or join rooms without leaving the site, then use video, mic, screenshare, chat, notes, action items, linked trading context, and shared music controls in one focused workspace.

## Goals

- Let users create and join native live rooms inside The Pit.
- Support browser mic, camera, and screenshare using WebRTC.
- Use Supabase Realtime for signaling, room chat, synced notes, action items, participant presence, and music state.
- Let rooms link to a trade entry and/or strategy so the review context is always visible.
- Keep the room UI intuitive: one screen, obvious controls, no meeting-app clutter.

## Non-Goals

- No recording in the MVP.
- No native mobile app call controls.
- No paid rooms, billing, or ticketing.
- No advanced host moderation beyond room owner identity.
- No guaranteed production TURN infrastructure in the first pass.

## User-Facing Features

### Room Lobby

The `/rooms` page shows:

- Active public rooms
- Recently created rooms
- Create Room form
- Room type filter

Room types:

- Trade Review
- Strategy Breakdown
- Backtest Review
- Open Floor
- Funded / Combine Prep

The lobby must make it obvious which rooms are live and what they are about.

### Create Room

Users can create a room with:

- Title
- Room type
- Public/private setting
- Optional linked trade
- Optional linked strategy
- Agenda

The user is sent to the room immediately after creation.

### Live Room Layout

The room page uses a trading-desk layout:

- Top bar: title, type, copy invite, room status, leave button
- Center stage: active screenshare if present, otherwise primary video
- Bottom strip: participant video tiles
- Right panel: linked trade and strategy context
- Lower/side panel: chat, notes, action items, music controls
- Floating call controls: mic, camera, screenshare, music, leave

The room should feel like a trade review desk, not a generic meeting clone.

### Video, Mic, And Screenshare

Users can:

- Join room media
- Toggle mic
- Toggle camera
- Start/stop screenshare
- See local preview
- See remote participants
- Leave and clean up media tracks

MVP supports small rooms first: 2-4 participants.

### Realtime Room Chat

Each room has chat messages:

- Author
- Body
- Timestamp

Chat is persisted in Supabase and also broadcast in realtime when possible.

### Synced Notes

Room notes are shared:

- One notes text area per room
- Updates persist to Supabase
- Manual save button
- Realtime broadcast when notes are saved

### Action Items

Users can add follow-through items:

- Body
- Done state
- Created by
- Created date

Action items are persisted and shown in the room.

### Shared Music Controls

The room has a simple shared music deck:

- Audio URL field
- Play/pause state
- Track title or URL display
- Host or any participant can update state in MVP

The first version syncs music state and exposes a local audio player. It does not route system audio into WebRTC.

## Technical Architecture

### WebRTC

The browser owns local media through:

- `navigator.mediaDevices.getUserMedia`
- `navigator.mediaDevices.getDisplayMedia`
- `RTCPeerConnection`

Supabase Realtime broadcasts signaling messages:

- offer
- answer
- ice-candidate
- peer-ready
- peer-left
- media-state

Each browser creates peer connections to other room participants. The MVP keeps this simple and targets small rooms.

### Supabase Realtime

Each room uses a channel:

`room:{roomId}`

The channel handles:

- WebRTC signaling broadcasts
- Presence
- Notes update notifications
- Music state updates
- Chat/action refresh notifications

### Persistence

Tables:

- live_rooms
- live_room_messages
- live_room_action_items

Room notes and music state live on `live_rooms`.

## Data Model

### live_rooms

- id
- host_id
- title
- room_type
- is_public
- status
- linked_entry_id
- linked_strategy_id
- agenda
- notes
- music_url
- music_title
- music_is_playing
- created_at
- updated_at

### live_room_messages

- id
- room_id
- user_id
- body
- created_at

### live_room_action_items

- id
- room_id
- user_id
- body
- is_done
- created_at
- updated_at

## Components And Pages

### Pages

- Rooms.jsx: lobby and create room flow.
- LiveRoom.jsx: native call room.

### Components

- RoomCreateForm
- RoomCard
- LiveStage
- ParticipantTile
- CallControls
- RoomContextPanel
- RoomChat
- RoomNotes
- RoomActionItems
- MusicDeck

### Hooks

- useRoomRealtime
- useWebRTCRoom

## Error Handling

- If camera/mic permission fails, user can still join room chat and notes.
- If screenshare fails, show an inline error and keep the call alive.
- If WebRTC signaling fails, show a call-state warning while keeping room context usable.
- If Supabase Realtime disconnects, show reconnecting state and avoid crashing.
- If linked trade/strategy fails to load, show room shell with a context warning.

## Testing

Manual verification:

- Create a public room.
- Create a private room.
- Join a room.
- Toggle mic.
- Toggle camera.
- Start and stop screenshare.
- Send chat messages.
- Save notes.
- Add and complete action items.
- Update music URL and play/pause state.
- Open the same room in two browser tabs and confirm signaling/chat/state broadcasts.

Automated/static verification:

- Run lint.
- Run production build.

## Implementation Order

1. Add schema SQL.
2. Add room constants and helpers.
3. Add room lobby and create room flow.
4. Add live room shell with context panel, chat, notes, action items, and music deck.
5. Add WebRTC hook and call controls.
6. Wire routes and navbar.
7. Run lint/build and commit.
