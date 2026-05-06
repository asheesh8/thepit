# Phase 3 Native Live Rooms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build native in-app live rooms with WebRTC mic/camera/screenshare, chat, notes, action items, linked trading context, and shared music controls.

**Architecture:** Add Supabase-backed room persistence, a Realtime channel per room, and browser WebRTC peer connections for small rooms. Keep room UX in focused components and isolate WebRTC/realtime behavior in hooks.

**Tech Stack:** React 19, React Router, Supabase JS/Reatime, browser WebRTC APIs, Vite.

---

### Task 1: Schema And Shared Room Helpers

**Files:**
- Create: `docs/supabase/phase-3-native-live-rooms.sql`
- Create: `src/lib/liveRooms.js`

- [x] **Step 1: Add SQL for rooms, messages, and action items.**
- [x] **Step 2: Add room type constants and helper formatters.**

### Task 2: Room Lobby

**Files:**
- Create: `src/components/RoomCreateForm.jsx`
- Create: `src/components/RoomCard.jsx`
- Create: `src/pages/Rooms.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Navbar.jsx`

- [x] **Step 1: Build create form and room card.**
- [x] **Step 2: Build lobby with public rooms and create flow.**
- [x] **Step 3: Wire `/rooms` route and nav.**

### Task 3: Live Room Shell And Realtime Panels

**Files:**
- Create: `src/hooks/useRoomRealtime.js`
- Create: `src/components/RoomContextPanel.jsx`
- Create: `src/components/RoomChat.jsx`
- Create: `src/components/RoomNotes.jsx`
- Create: `src/components/RoomActionItems.jsx`
- Create: `src/components/MusicDeck.jsx`
- Create: `src/pages/LiveRoom.jsx`

- [x] **Step 1: Add room realtime hook.**
- [x] **Step 2: Build chat, notes, action items, music deck.**
- [x] **Step 3: Build live room shell with linked context.**

### Task 4: WebRTC MVP

**Files:**
- Create: `src/hooks/useWebRTCRoom.js`
- Create: `src/components/LiveStage.jsx`
- Create: `src/components/ParticipantTile.jsx`
- Create: `src/components/CallControls.jsx`
- Modify: `src/pages/LiveRoom.jsx`

- [x] **Step 1: Add WebRTC hook for local media, screenshare, peer signaling, and cleanup.**
- [x] **Step 2: Add stage, tiles, and controls.**
- [x] **Step 3: Integrate controls into room page.**

### Task 5: Verification And Commit

**Files:**
- Modify as needed.

- [x] **Step 1: Run lint.**
- [x] **Step 2: Run build.**
- [x] **Step 3: Commit Phase 3 implementation.**
