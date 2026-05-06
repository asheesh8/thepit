# The Pit Phase 1: Discipline Engine Design

## Summary

Phase 1 turns The Pit from a social trading journal into a process-driven trading operating system. The build focuses on daily consistency, personal strategy definition, backtesting reflection, and printable strategy rules. Live calls and deeper community review remain future phases.

## Goals

- Reward consistent journaling and reflection with Pit Streak badges.
- Let traders create, review, and reuse their own strategy playbooks.
- Let users download a wall-printable PDF poster for each strategy.
- Categorize each entry as combine, funded, backtest, or personal/sim.
- Give backtesting its own workspace organized by strategy, thesis, entries, reflections, and follow-through.
- Add calendar views for trade activity and reflection consistency.

## Non-Goals

- No live audio, video, or screenshare in Phase 1.
- No public marketplace for strategies.
- No automated broker import.
- No AI-generated coaching.
- No paid subscription or billing work.

## User-Facing Features

### Pit Streak And Badges

The app tracks reflection consistency, not profit. A qualifying streak day is any day where the user logs a trade entry, writes a backtest reflection, or completes a strategy follow-through note.

Badges are shown on the user's Journal and Profile:

- 3 Day Pit Streak
- 7 Day Pit Streak
- 14 Day Pit Streak
- Backtest Grinder
- Rule Follower
- First Strategy Built
- First Funded Reflection

Badges must feel stark and earned, using the existing red, green, bone, and charcoal visual system. They are not playful trophies.

### Strategy Library

Users get a new Strategies area where they can create and manage strategy playbooks. A strategy contains:

- Name
- Market or instrument
- Timeframes
- Setup conditions
- Entry rules
- Stop rules
- Take-profit rules
- Invalidation rules
- Risk rules
- Mistakes to avoid
- Example notes
- Optional mantra

Strategies are private by default. In Phase 1, strategies are for personal structure and linking to trades/backtests.

### Strategy PDF Poster

Each strategy has a Download Poster action. The poster is generated client-side as a PDF and formatted as a clean wall reference:

- Large strategy name
- Setup checklist
- Entry rules
- Exit and stop rules
- Risk rules
- Do-not-trade-if section based on invalidation and mistakes
- Optional mantra

The poster must be readable when printed, not just pretty on screen.

### Trade Category System

The trade entry form adds an account/context category:

- Combine
- Funded
- Backtest
- Personal / Sim

Every entry can link to a strategy. Backtest entries must show a stronger prompt to choose a strategy because the backtesting workspace groups by strategy.

### Backtesting Reflection Hub

The Backtesting area gives each strategy its own research workspace:

- Strategy being tested
- Test thesis written like a short blog post
- Linked backtest trade entries
- Reflection posts under that strategy
- Follow-through prompts after each reflection

Reflection prompts include:

- What pattern did this sample reveal?
- What rule held up?
- What rule failed?
- What will change in the next test batch?
- What must stay unchanged until the sample is large enough?

This makes backtesting feel like a structured research journal instead of a pile of screenshots.

### Calendars

Phase 1 includes two calendar views:

- Trade Calendar: shows trade days, P&L, number of entries, and category mix.
- Reflection Calendar: shows journal/reflection activity and streak continuity.

Calendars can start as monthly grids using local computed data from Supabase rows. They do not need drag-and-drop or advanced scheduling.

## Navigation

The authenticated navbar adds:

- Strategies
- Backtesting
- Calendar

Journal remains the user's private trade log. Feed remains the public floor. New Entry remains the place to create a trade.

## Data Model

New tables:

### strategies

- id
- user_id
- name
- market
- timeframes
- setup_conditions
- entry_rules
- stop_rules
- take_profit_rules
- invalidation_rules
- risk_rules
- mistakes_to_avoid
- example_notes
- mantra
- created_at
- updated_at

### backtest_reflections

- id
- user_id
- strategy_id
- title
- body
- sample_size
- lesson
- next_follow_through
- completed_follow_through
- created_at
- updated_at

### user_badges

- id
- user_id
- badge_key
- earned_at

Existing entries table additions:

- trade_context: combine, funded, backtest, personal_sim
- strategy_id: nullable foreign key to strategies

Badges are calculated client-side from entries and reflections, then persisted when earned. The client must avoid duplicating badge rows for the same user and badge key.

## Components And Pages

### Pages

- Strategies.jsx: list, create, and view strategies.
- StrategyDetail.jsx: edit strategy, see linked entries, download PDF poster.
- Backtesting.jsx: grouped strategy research dashboard.
- Calendar.jsx: trade and reflection calendar tabs.

### Components

- BadgeStrip: compact earned badge display.
- StrategyForm: reusable create/edit form.
- StrategyCard: summary card for strategy library.
- StrategyPoster: print/PDF layout source.
- TradeContextPicker: combine/funded/backtest/personal selector.
- StrategySelect: strategy dropdown for entries and backtests.
- CalendarMonth: shared monthly grid.
- BacktestReflectionComposer: creates strategy reflection posts.
- BacktestReflectionCard: displays reflection and follow-through state.

## Data Flow

- NewEntry loads the user's strategies and lets the user attach one to the entry.
- Journal loads entries with strategy metadata and computes streak stats.
- Strategies pages own strategy CRUD.
- Backtesting loads strategies, backtest entries, and backtest reflections.
- Calendar loads entries and reflections, then computes per-day summaries in memory.
- Badge checks run after entry/reflection creation and when Journal loads.

## Error Handling

- If strategy loading fails, entry logging still works without a strategy link.
- If PDF generation fails, show an inline error and keep the strategy page usable.
- If badge persistence fails, never block the user's main action.
- If Supabase schema columns are missing, show useful UI errors instead of blank pages.

## Testing

Manual verification:

- Create a strategy.
- Edit a strategy.
- Download a PDF poster.
- Log combine, funded, backtest, and personal/sim entries.
- Link a backtest entry to a strategy.
- Add a backtest reflection and mark follow-through complete.
- Confirm streak badges appear after qualifying activity.
- Confirm Trade Calendar and Reflection Calendar show expected days.

Automated or static checks:

- Run lint.
- Run production build.
- Add focused tests only if the app already has a test harness or if the implementation introduces shared date/badge utilities worth testing.

## Implementation Order

1. Add schema assumptions and shared constants for trade contexts and badge definitions.
2. Add strategy library CRUD.
3. Add strategy linking and trade context fields to NewEntry and journal/feed cards.
4. Add PDF poster generation.
5. Add backtesting reflection hub.
6. Add badge calculation and display.
7. Add trade and reflection calendars.

## Future Phases

Phase 2 will add callout threads, richer profile stats, public strategy sharing, and community review workflows.

Phase 3 will add live rooms with voice, video, screenshare, invite links, and trade/strategy review context.
