# Phase 1 Discipline Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 1 of The Pit's Discipline Engine: strategies, backtest reflections, streak badges, trade categories, calendars, and printable strategy posters.

**Architecture:** Keep the Vite/React/Supabase app structure. Add focused shared utility modules for constants, date grouping, badge calculation, and poster printing, then add pages and small reusable components around the existing card-heavy UI language.

**Tech Stack:** React 19, React Router, Supabase JS, browser print-to-PDF, Vite, CSS variables from `src/index.css`.

---

### Task 1: Shared Discipline Utilities

**Files:**
- Create: `src/lib/discipline.js`
- Create: `src/lib/calendar.js`

- [x] **Step 1: Define trade contexts, badge definitions, strategy labels, and helpers**

Create `src/lib/discipline.js` with exported constants and badge calculation functions.

- [x] **Step 2: Define calendar/date grouping helpers**

Create `src/lib/calendar.js` with month grid and per-day activity helpers.

- [x] **Step 3: Run lint/build after implementation**

Run `npm run build`.

### Task 2: Strategy Library

**Files:**
- Create: `src/components/StrategyForm.jsx`
- Create: `src/components/StrategyCard.jsx`
- Create: `src/pages/Strategies.jsx`
- Create: `src/pages/StrategyDetail.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Navbar.jsx`

- [x] **Step 1: Build reusable strategy form/card**

Create focused components that use the app's existing stark form and card styling.

- [x] **Step 2: Build Strategies list/create page**

Load the current user's strategies, create new strategies, and show empty/error states.

- [x] **Step 3: Build Strategy Detail edit page**

Load one strategy, edit it, show linked entries, and expose poster download.

- [x] **Step 4: Wire routes and navbar links**

Add `/strategies` and `/strategies/:id`.

### Task 3: Entry Category And Strategy Linking

**Files:**
- Create: `src/components/TradeContextPicker.jsx`
- Create: `src/components/StrategySelect.jsx`
- Modify: `src/pages/NewEntry.jsx`
- Modify: `src/components/EntryCard.jsx`
- Modify: `src/pages/Feed.jsx`
- Modify: `src/pages/Journal.jsx`

- [x] **Step 1: Add entry controls**

Add context and strategy fields to the trade form, while letting entry logging continue if strategy loading fails.

- [x] **Step 2: Persist new entry metadata**

Insert `trade_context` and `strategy_id` with entries.

- [x] **Step 3: Display context and strategy metadata**

Show category and linked strategy tags on trade cards and load joined strategy data where needed.

### Task 4: Backtesting Hub

**Files:**
- Create: `src/components/BacktestReflectionComposer.jsx`
- Create: `src/components/BacktestReflectionCard.jsx`
- Create: `src/pages/Backtesting.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Navbar.jsx`

- [x] **Step 1: Build reflection composer/card**

Support thesis-style reflections, lesson, sample size, next follow-through, and completion toggle.

- [x] **Step 2: Build grouped backtesting dashboard**

Group backtest entries and reflections by strategy.

- [x] **Step 3: Wire `/backtesting` route**

Add navigation and route protection.

### Task 5: Badges And Calendars

**Files:**
- Create: `src/components/BadgeStrip.jsx`
- Create: `src/components/CalendarMonth.jsx`
- Create: `src/pages/Calendar.jsx`
- Modify: `src/pages/Journal.jsx`
- Modify: `src/pages/Profile.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Navbar.jsx`

- [x] **Step 1: Show badge strip**

Compute and persist badge rows without blocking primary UI actions.

- [x] **Step 2: Add calendar page**

Add trade and reflection monthly views from entries and backtest reflections.

- [x] **Step 3: Wire `/calendar` route**

Add navigation and route protection.

### Task 6: Schema Notes And Verification

**Files:**
- Create: `docs/supabase/phase-1-discipline-engine.sql`

- [x] **Step 1: Document required Supabase schema**

Create SQL for new tables, columns, policies, and indexes.

- [x] **Step 2: Verify build**

Run `npm run build` and fix failures.
