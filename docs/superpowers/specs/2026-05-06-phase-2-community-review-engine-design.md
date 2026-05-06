# The Pit Phase 2: Community Review Engine Design

## Summary

Phase 2 turns The Pit's social layer into a structured review system. The build focuses on real callout threads, richer trader profiles, public strategy sharing, and a feed for trades that need feedback. Live calls remain Phase 3.

## Goals

- Turn callouts from simple reactions into review threads with reasons, replies, and resolution.
- Make profile pages show trader process stats, not just posts and resources.
- Let users publish strategies and let other traders save a copy into their own library.
- Add a review feed that highlights trades and strategies worth discussing.

## Non-Goals

- No voice, video, or screenshare.
- No private group rooms.
- No moderation tooling beyond deleting a user's own callout/reply.
- No paid strategy marketplace.
- No ranking users by total P&L.

## User-Facing Features

### Callout Threads

Each public trade can have callout threads. A callout thread contains:

- Entry being reviewed
- Author
- Reason
- Body
- Resolved state
- Replies
- Created date

Supported reasons:

- Late Entry
- No Invalidation
- Oversized
- Emotional Trade
- Moved Stop
- Good Loss
- Clean Execution
- Strategy Mismatch
- Other

The existing `CALLOUT` reaction remains as a lightweight signal, but the callout button should open the callout composer. Callout threads appear under the trade card and can be resolved by the trade owner or the callout author.

### Rich Profile Stats

Profile headers gain a stats strip computed from visible data:

- Public trades
- Public win rate
- Public total P&L
- Average mindset
- Most used public strategy
- Backtests logged
- Trade context split
- Earned badges

The stats should emphasize process and transparency. P&L is present but not the main identity.

### Public Strategy Sharing

Strategies gain an `is_public` flag.

When a strategy is public:

- It appears on the owner's Profile under a Strategies tab.
- Other users can view it.
- Other users can save a copy to their own Strategy Library.
- The copied strategy is private by default and its name is prefixed with `Copy of`.

Public strategy detail pages show the playbook sections and any public trades linked to that strategy.

### Community Review Feed

Add a Review page with three filters:

- Needs Callout: public trades with zero callout threads.
- Recently Reviewed: public trades with recent callout activity.
- Public Strategies: public strategies from other traders.

This gives users a place to find trades to review and strategies to study.

## Navigation

The authenticated navbar adds:

- Review

Profile tabs become:

- Trades
- Strategies
- Resources

## Data Model

New tables:

### callout_threads

- id
- entry_id
- user_id
- reason
- body
- is_resolved
- created_at
- updated_at

### callout_replies

- id
- thread_id
- user_id
- body
- created_at

Existing strategies table additions:

- is_public boolean default false
- source_strategy_id nullable uuid

## Components And Pages

### Pages

- Review.jsx: community review feed with Needs Callout, Recently Reviewed, and Public Strategies filters.

### Components

- CalloutThreadList: loads and displays threads for a trade.
- CalloutComposer: creates a new structured callout.
- CalloutThreadCard: displays reason, body, replies, and resolve action.
- ProfileStatsStrip: process-oriented stats for profile headers.
- PublicStrategyPanel: profile tab for public strategies.

## Data Flow

- EntryCard loads callout thread counts with feed/profile queries when available.
- Opening callouts loads callout threads and replies for the entry.
- Creating a callout inserts a callout thread and refreshes the local list.
- Replying inserts a callout reply and appends it to the thread.
- Resolving updates the thread's `is_resolved`.
- Profile loads entries, strategies, reflections, and badges to compute stats.
- Review loads public entries and public strategies, then filters client-side for the initial version.
- Cloning a strategy inserts a private strategy for the current user with `source_strategy_id`.

## Error Handling

- If callout threads fail to load, the trade card still renders and shows an inline error in the callout area.
- If strategy cloning fails, show an inline error and do not navigate.
- If public strategy columns are missing, strategy pages remain usable for private strategies and show a schema warning.
- If review feed queries fail, show a focused error state instead of a blank page.

## Testing

Manual verification:

- Create a callout thread on a public trade.
- Reply to a callout thread.
- Resolve and unresolve a callout thread.
- Confirm Profile stats update from public entries and strategies.
- Mark a strategy public.
- View another user's public strategy from Profile or Review.
- Clone a public strategy.
- Use Review filters for Needs Callout, Recently Reviewed, and Public Strategies.

Automated or static checks:

- Run lint.
- Run production build.

## Implementation Order

1. Add schema notes and shared callout/profile helpers.
2. Add callout thread components and wire them into EntryCard.
3. Add public strategy toggle, public strategy viewing, and cloning.
4. Add profile stats and Strategies tab.
5. Add Review page and navbar route.
6. Run lint/build and commit Phase 2.

## Future Phase

Phase 3 will add live rooms with voice, video, screenshare, invite links, and trade/strategy review context.
