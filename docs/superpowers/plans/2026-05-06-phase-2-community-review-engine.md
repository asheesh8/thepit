# Phase 2 Community Review Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build The Pit's Phase 2 community review layer with structured callout threads, public strategy sharing, richer profiles, and a review feed.

**Architecture:** Extend the existing React/Supabase app with focused callout, strategy sharing, profile stats, and review feed components. Keep the existing EntryCard and Profile surfaces as integration points while isolating new behavior in reusable components and helpers.

**Tech Stack:** React 19, React Router, Supabase JS, Vite, existing CSS variables and inline style patterns.

---

### Task 1: Shared Review Utilities And Schema

**Files:**
- Create: `src/lib/community.js`
- Create: `docs/supabase/phase-2-community-review-engine.sql`

- [x] **Step 1: Define callout reasons and profile stat helpers.**
- [x] **Step 2: Document Supabase tables, columns, indexes, and policies.**

### Task 2: Callout Threads

**Files:**
- Create: `src/components/CalloutComposer.jsx`
- Create: `src/components/CalloutThreadCard.jsx`
- Create: `src/components/CalloutThreadList.jsx`
- Modify: `src/components/EntryCard.jsx`

- [x] **Step 1: Build composer, card, and list components.**
- [x] **Step 2: Wire EntryCard callout button to structured threads.**
- [x] **Step 3: Support replies and resolved/unresolved state.**

### Task 3: Public Strategy Sharing

**Files:**
- Modify: `src/pages/StrategyDetail.jsx`
- Modify: `src/pages/Strategies.jsx`
- Modify: `src/components/StrategyCard.jsx`

- [x] **Step 1: Add public/private toggle to strategy detail.**
- [x] **Step 2: Allow viewing public strategies owned by others.**
- [x] **Step 3: Allow cloning public strategies as private copies.**

### Task 4: Profile Stats And Public Strategies

**Files:**
- Create: `src/components/ProfileStatsStrip.jsx`
- Create: `src/components/PublicStrategyPanel.jsx`
- Modify: `src/pages/Profile.jsx`

- [x] **Step 1: Compute and display process stats.**
- [x] **Step 2: Add Strategies profile tab.**

### Task 5: Community Review Feed

**Files:**
- Create: `src/pages/Review.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Navbar.jsx`

- [x] **Step 1: Build Review page filters.**
- [x] **Step 2: Wire route and nav.**

### Task 6: Verification

**Files:**
- Modify as needed from previous tasks.

- [x] **Step 1: Run lint and fix issues.**
- [x] **Step 2: Run build and fix issues.**
- [x] **Step 3: Commit Phase 2 implementation.**
