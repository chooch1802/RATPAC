> Canonical plan document (source of truth).
> Legacy alias: `PLAYERS_PLAN.md`.

I now have a comprehensive understanding of the existing codebase. Let me produce the full plan.

---

# RATPAC — Complete Product & Technical Plan

## Codebase Inventory Summary (What Already Exists)

The existing `/Users/ethanrennie/Desktop/stroke` app is a meaningful head start. Here is what survives the pivot intact, what gets repurposed, and what gets cut.

**Survives intact:** `groups`, `group_members`, `wallet_balances`, `wallet_transactions`, `withdrawal_requests`, `webhook_events`, `subscriptions`, `activity_feed`, `feed_reactions` tables; `hold_funds`, `release_escrow_to_winner`, `refund_escrow`, `increment_round_pot` DB functions; wallet-topup, wallet-withdraw, webhook-stripe, webhook-airwallex edge functions; AuthContext (phone OTP), WalletPage, GroupsPage, GroupDetailPage, SubscribePage; all UI primitives (Button, Card, Input, Modal, Spinner, Toast).

**Repurposed with modification:** `rounds` table becomes `games` (rename + drop course_id dependency, add sport-agnostic columns); `bets` + `bet_legs` + `bet_participants` stay but get new types and a `game_mode` column; bet-create, bet-settle edge functions get rewritten for declaration-based settlement rather than score-based; `profiles` gets DOB + age_verified columns; NewRoundPage becomes NewGamePage with the new 5-step wizard.

**Cut entirely:** `scores`, `round_participants.handicap_at_time`, `courses`, `dot_events`, `wolf_decisions` tables; HoleScoringPage, Scorecard component, AdminValidationPanel, round-score edge function, `course-search` edge function; settlement.js and handicap.js utility files.

**Sports seed data (002_multi_sport.sql):** Keep the `sports` and `venues` tables. Update the sports seed: remove AFL, Cricket, Basketball, Darts, Running, Fishing. Seed only Golf, Tennis, Pickleball, Pool, Custom.

---

## 1. Core Product Architecture

### The Fundamental Wagering Loop

```
CREATE GAME          INVITE           LOCK IN         PLAY          DECLARE         SETTLE
sport + format  →  QR / link    →  escrow funds  →  real life  →  tap outcome  →  wallet credit
     (game record)    (join code)    (hold_funds)                  (declaration)   (release_escrow)
```

**Detailed state machine for a `game` record:**

- `setup` — created by host, waiting for mates to join. Funds not yet escrowed.
- `locked` — host taps "Start game". Funds escrowed from all confirmed participants. No new joiners.
- `declaring` — one or more participants have submitted an outcome declaration. Dispute window open.
- `disputed` — conflicting declarations submitted. Funds remain in escrow. Admin review or vote required.
- `complete` — outcome confirmed (consensus or timeout). Funds released to winner(s).
- `cancelled` — game cancelled before lock. All escrow refunded.

**The game entity replaces the `rounds` table.** Key columns added: `game_mode` ('wallet' | 'cash'), `status` (enum above), `declaration_deadline TIMESTAMPTZ`, `outcome_config JSONB`, `press_enabled BOOLEAN`.

### Outcome Declaration

Outcome declaration is the core trust mechanism. Since there are no live scores, the app relies on a two-step confirmation model that is frictionless for normal use but has an escalation path for disputes.

**Who can declare:**
- Any confirmed participant can submit a declaration for a completed bet leg or the overall game.
- For structured bets (nassau, match_play, skins, wolf), the creator nominates the "result reporter" during game setup, defaulting to themselves.
- For custom free-text bets, both parties must confirm.

**Declaration confirmation flow (2-of-N model):**

1. Player A taps "Declare result" and selects winner + optional note.
2. Push notification fires to all other participants: "Ethan declared the match result."
3. Other participants have a **2-hour window** to confirm or dispute.
4. If all others confirm (or the window expires with no dispute): auto-settle fires.
5. If any player taps "Dispute": game enters `disputed` status.

**Dispute resolution:**

- Funds stay in escrow.
- Both parties can submit a text explanation.
- A majority vote among all game participants settles it (e.g. a 4-player game: 3 votes required). For 2-player games, it requires admin review.
- Admin panel shows all disputed games. Admin can force-settle to either side or refund all.
- If no resolution in 7 days, auto-refund all participants.

**Anti-cheat philosophy:** This app is for mates, not strangers. The social pressure of a named dispute in a group with 4 real people you know is a stronger deterrent than any technical mechanism. The system records all declarations with timestamps and immutable ledger entries. Screenshots and receipts are the "proof." The 2-hour dispute window plus group social pressure handles the overwhelming majority of edge cases.

### Cash Game Mode vs Wallet Mode

| Aspect | Wallet Mode | Cash Game Mode |
|---|---|---|
| Funds | Real AUD held in escrow | No money movement in app |
| Setup | All participants need wallet balance | Anyone can join, no balance required |
| Settlement | Auto-credited to winner wallet | App shows net debt summary + PayID deep link |
| Transaction ledger | Full ledger entries | Debt records only (no wallet_transactions rows) |
| Notification | "You won $40 — check your wallet" | "You owe Ethan $40 — pay via PayID" |
| Subscription | Required | Required (feature parity) |

Cash game mode adds one table: `cash_debts (game_id, debtor_id, creditor_id, amount, settled_at)`. The PayID deep link format for Australian banks is `payid://pay?amount=40&payid=0411234567&description=RATPAC+golf+bet`. The app generates this from the winner's phone number (pulled from their profile).

### Tournament Structure

A tournament is a container that holds multiple games over a defined period. Tournaments live within a group. One group can have at most one active tournament at a time.

**Tournament entity:**

```
tournaments
  id, group_id, name, sport_id
  entry_fee NUMERIC          -- per-player buy-in to the pot
  game_fee NUMERIC           -- optional per-game additional contribution
  scoring_method TEXT        -- 'points' | 'net_winnings'
  start_date DATE, end_date DATE
  rounds_count INT           -- if fixed rounds (NULL = date-based)
  payout_structure JSONB     -- [{rank:1, pct:60},{rank:2, pct:30},{rank:3, pct:10}]
  status TEXT                -- 'registration' | 'active' | 'complete'
  pot_total NUMERIC
  winner_id UUID
  created_by UUID
```

**How the pot builds:**
- When a player joins the tournament, `entry_fee` is held from their wallet.
- Each time a tournament-linked game is completed, if `game_fee > 0`, it is deducted and added to `tournament_pot`.
- Points: each game win = 3 pts, draw = 1 pt, loss = 0. Leaderboard ranked by points, then net winnings as tiebreaker.

**Payout:** On `end_date` (or when all rounds complete), a cron job fires `tournament-payout` edge function. Winner gets `pot_total * 0.60`, second gets `pot_total * 0.30`, third gets `pot_total * 0.10` (configurable). If a player drops out mid-tournament, their entry fee stays in the pot (no refund — this is specified in tournament T&Cs shown at join time).

---

## 2. Sports and Game Types

### Golf

**Create a game wizard steps:** Sport → Venue (course search or manual) → Wager types (multi-select) → Amounts → Invite.

**Wagering formats available:**

**Nassau** — Three separate legs: Front 9, Back 9, Overall 18. Each leg has its own dollar amount. Outcome declaration: host declares winner of each 9 and the overall. All three can have different winners. Auto-press pop-up: when a player is down 2 holes on any 9, a push notification fires: "You're 2 down on the back 9 — press?" with Accept/Decline buttons. Accepting creates a new bet_leg for the press with a matching amount from both parties' wallets.

**Skins** — Each hole is worth a skin. Carryover when tied. Outcome declaration: hole-by-hole, declared by host at game end (not during play — this is not a scoring app). Host taps through a simple "who won hole 1?" → "who won hole 2?" flow at game end. Each player's skin count is displayed. Skins winnings auto-calculate from the hole values and carryover.

**Match Play** — Head-to-head. Single leg. Winner declared at game end. Supports 2v2 team format: Team A has two players, Team B has two players, each team's hole result is best ball.

**Wolf** — Golf-specific. 4 players, rotating Wolf each hole. Wolf can go Lone Wolf (1v3) or pick a partner (2v2) after seeing all tee shots. For RATPAC, Wolf is implemented as a structured custom bet: host sets a per-hole amount. At end of game, host declares Wolf outcome per hole via a simple swipe-through flow. Settlement calculated automatically.

**Structured custom** — "I bet Ethan $50 he can't break 90." Pick a challenger and the terms from a dropdown (or free text), set amount, set who declares winner. Auto-settle on declaration.

**Free-text custom** — "Whoever has the lowest net score buys lunch." No dollar amount (or a nominal amount). Manual settle — both parties tap "Settled outside app."

### Tennis

**Create a game:** Sport → Venue name → Format (singles/doubles) → Scoring system (standard sets, tiebreak only, match tiebreak) → Wager.

**Wager types:**

- **Match winner** — Single leg. Simple head-to-head. Winner taps "I won" after the match, confirmed by opponent.
- **Set betting** — Multiple legs, one per set. Declare set-by-set. Useful for longer best-of-3 or best-of-5 matches.
- **Handicap** — "I'll give you a game a set." Host sets the handicap, outcome declaration adjusts accordingly.
- **Structured custom** — "First to hold serve 5 times wins $20." Free text terms, manual settle.

**2v2:** Doubles match — Team A vs Team B. Both team members share the pot. Winner team confirmed by either member.

### Pickleball

**Create a game:** Sport → Venue → Format (singles/doubles) → Game scoring (standard 11 pts, best-of-3, rally scoring) → Wager.

**Wager types:**

- **Match winner** — Most common. Single leg.
- **Game-by-game** — Three legs in a best-of-3. Declare game results one by one.
- **Handicap** — "You get 3 points head start per game."
- **Structured custom** — "Losers buy drinks."

**Declaration:** Winner declares, loser confirms within 2 hours.

### Pool/Billiards

**Create a game:** Sport → Venue (pub name) → Variant (8-ball, 9-ball, snooker) → Format (single game, race to 3, race to 5) → Wager.

**Wager types:**

- **Match winner** — Most common. Race to N frames.
- **Frame-by-frame** — Leg per frame. For race to 3, three legs.
- **Run-out bet** — "I'll pay $10 every time you run the table." Structured custom with auto-settle.
- **Handicap** — "You get ball-in-hand on break."
- **Structured custom / free text** — Standard.

**Declaration:** Simpler than golf — one player declares match winner, opponent confirms.

### Universal Bet Types Summary

Every sport supports these bet type configurations in the `bets.type` column:

```
'match_winner'        -- single leg, P2P or team
'leg_by_leg'          -- multiple discrete legs (sets, frames, holes)
'nassau'              -- golf-specific 3-leg format (kept for golf only)
'skins'               -- golf-specific hole-by-hole
'wolf'                -- golf-specific
'custom_structured'   -- both parties agree on terms + auto-settle on declaration
'custom_freetext'     -- no auto-settle, manual both-party confirm
'tournament_entry'    -- tournament pot contribution
```

---

## 3. Platform Strategy — Capacitor.js Recommendation

**Recommendation: Capacitor.js wrapping the existing React app.**

React Native would require a complete rewrite of every UI component, all 20 pages, all contexts, and the routing layer. That is a 3-4 month delay. The existing codebase already has the correct architecture for Capacitor: React Router DOM handles navigation (Capacitor uses the same web view), Supabase JS works identically in Capacitor, Framer Motion works in a web view, and all existing edge functions are platform-agnostic.

Capacitor gives full App Store and Google Play presence with a genuine native wrapper, not a PWA shortcut. Native plugins access the device's real push notification token (APNs on iOS, FCM on Android), which is a hard requirement.

**What changes are needed to make the current React app work in Capacitor:**

1. **Install Capacitor:** `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`. Run `npx cap init`. This generates `capacitor.config.ts` pointing at the `dist` folder.

2. **Push notifications plugin:** `npm install @capacitor/push-notifications`. Replace any browser Notification API calls with `PushNotifications.register()`. The plugin fires on both platforms and hands back a device token to be saved in a new `device_tokens` table in Supabase.

3. **Deep links / universal links:** The `/join/:code` route needs to be handled as a universal link on iOS (`apple-app-site-association` file on the domain) and an App Link on Android (`assetlinks.json`). Capacitor's `@capacitor/app` plugin handles the `appUrlOpen` listener. The `BrowserRouter` in `App.jsx` needs to be swapped for a custom history that accepts the deep link URL on app launch.

4. **Safe area insets:** The existing `pt-12` padding on header sections already compensates for notch/status bar. Add `@capacitor/status-bar` plugin and call `StatusBar.setStyle({ style: Style.Dark })` to match the navy theme.

5. **Haptic feedback:** `npm install @capacitor/haptics`. Call `Haptice.impact({ style: ImpactStyle.Light })` on all `whileTap` Framer Motion elements for native feel.

6. **Keyboard handling:** On iOS, the WebView may be pushed up by the keyboard. Set `"KeyboardResize": "body"` in capacitor.config to prevent layout breakage in bet entry forms.

7. **Stripe in Capacitor:** Stripe's React Elements work in the WebView. For Apple Pay, use `@stripe/stripe-js` with `applePay` enabled — Apple Pay works in WKWebView on iOS 16+.

8. **Splash screen + icons:** Use `@capacitor/splash-screen` with a custom RATPAC branded splash. Generate all required icon sizes (1024x1024 source, auto-generated by Capacitor's asset tool).

9. **App Store requirements:** Privacy manifest (required from iOS 17), NSPhotoLibraryUsageDescription (for avatar upload), NSCameraUsageDescription (for QR scanning). Add a Privacy Policy URL (required for any financial app). Age rating must be set to 17+ due to gambling content.

10. **Google Play requirements:** Target SDK 34+. The `real money gambling` flag must be checked in the Play Console. This triggers a gambling licence review — see Legal section for implications.

**Build pipeline:** `npm run build && npx cap sync && npx cap open ios` (opens Xcode for iOS build). For CI/CD: use Fastlane with `gym` (iOS) and `gradle` (Android). Recommended CI: GitHub Actions with `macos-latest` runner for iOS, `ubuntu-latest` for Android.

---

## 4. Push Notification Strategy

Push notifications are delivered via Firebase Cloud Messaging (FCM) on Android, and Apple Push Notification service (APNs) on iOS. The `@capacitor/push-notifications` plugin abstracts both. When a device registers, the token is saved to a new `device_tokens (user_id, token, platform, created_at)` table. A new `send-push-notification` edge function uses the FCM HTTP v1 API and APNs HTTP/2 API to dispatch notifications server-side.

| Notification | Trigger | Priority | Payload |
|---|---|---|---|
| Game invite received | User joins via `/join/:code` | Immediate | "Ethan invited you to a golf bet" |
| Mate joined your game | `round_participants` INSERT | Immediate | "Jake joined your Nassau — 3/4 players" |
| Game locked / starting | Host taps "Start game" | Immediate | "Game on! Funds locked. Good luck." |
| Outcome declared by opponent | `outcome_declarations` INSERT | Immediate | "Ethan declared he won the match. Confirm or dispute?" |
| You won (auto-settle) | `release_escrow_to_winner` fires | Immediate | "$40 landed in your wallet. Nice work." |
| You lost (auto-settle) | `release_escrow_to_winner` fires | Immediate | "Ethan wins this one. Better luck next time." |
| Press bet suggested (Nassau) | Score delta >= 2 on a Nassau 9 | Immediate | "You're 2 down on the back 9 — press Ethan for $20?" |
| Tournament standings update | Any tournament game completes | Batched (daily digest if >3 games) | "Tournament update: Ethan leads 9pts" |
| Wallet credited | Any `bet_win` wallet_transactions INSERT | Immediate | "Wallet topped up: +$40" |
| Trial expiring in 3 days | Cron job, trial_ends_at - 3 days | Batched (9am local) | "Your free trial ends in 3 days. Subscribe to keep playing." |
| Payment failed | webhook-stripe `invoice.payment_failed` | Immediate | "Payment failed. Update your card to keep playing." |
| Trash talk comment | `game_comments` INSERT | Immediate | "Jake: 🤣 you absolute 🐔" |
| New sidebet offer in group | `bet_offers` INSERT | Batched (max 1/hr/group) | "New sidebet offer in The Boys: $20 on pool." |
| Dispute opened | `game_disputes` INSERT | Immediate | "Ethan disputed the match result. Your input is needed." |
| Tournament about to end | Cron, end_date - 24hrs | Batched (9am) | "Tournament ends tomorrow! You're in 2nd. One game left." |

**Batching logic:** The `send-push-notification` edge function checks a `notification_preferences` column on `profiles` to respect quiet hours (default: 10pm-8am local). Tournament and sidebet offer notifications are batched using a `notification_queue` table processed by a nightly cron.

---

## 5. Outcome Declaration and Anti-Cheat

### Declaration Flow (Detailed)

The `outcome_declarations` table records every declaration event:

```sql
CREATE TABLE outcome_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id),
  bet_id UUID REFERENCES bets(id),          -- NULL = whole game result
  declarer_id UUID NOT NULL REFERENCES profiles(id),
  declared_winner_id UUID REFERENCES profiles(id),  -- NULL = push/tie
  declared_winner_team TEXT,                -- 'A' | 'B' for team bets
  notes TEXT,
  status TEXT DEFAULT 'pending',            -- 'pending' | 'confirmed' | 'disputed' | 'overridden'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE declaration_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES outcome_declarations(id),
  confirmer_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (action IN ('confirm', 'dispute')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (declaration_id, confirmer_id)
);
```

**Auto-settle trigger:** A DB function `check_declaration_consensus(declaration_id)` is called after each `declaration_confirmations` INSERT. It counts confirms vs disputes. If all non-declarers have confirmed, or the 2-hour window has expired with no disputes, it calls `release_escrow_to_winner`. This function runs as SECURITY DEFINER to prevent clients from directly triggering settlement.

**2-player games:** Only one confirmation needed (the opponent). If the opponent does not respond within 2 hours, the declaration stands and auto-settle fires. This is the default "trust" path for mates.

**3-4 player games (skins, wolf, group bets):** Majority consensus required. For a 4-player game, 2 of the 3 non-declarers must confirm.

**Dispute escalation:**

1. Any participant taps "Dispute" and writes a reason (minimum 10 characters, enforced client-side).
2. Game enters `disputed` status. All escrow remains locked.
3. All participants (not just the disputing party) are notified.
4. A "community vote" modal opens in the game for all participants. Each player votes for a winner (or "refund all").
5. Majority wins. For 2-player disputes with no majority possible: admin review queue.
6. Admin panel (`/admin/disputes`) shows: game details, both declarations, both reasons, participant names. Admin can: force winner A, force winner B, or refund all.
7. If no admin action in 7 days: full refund to all participants.

**Preventing bad actors at sign-up:** The platform is invite-only within groups. You cannot bet against strangers. The social graph (group membership) is the primary trust layer.

### Refund Flow

When a dispute resolves as "refund all":
1. `bet-settle` edge function is called with `action: 'refund'`.
2. For each participant in `bet_participants`, `refund_escrow(user_id, their_escrowed_amount, bet_id)` is called.
3. Wallet transaction type `bet_refund` is recorded.
4. A push notification goes to all: "Game result disputed — your $40 has been refunded."

---

## 6. Social Features

### Trash Talk (Game Comments)

```sql
CREATE TABLE game_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL CHECK (length(body) <= 500),
  parent_id UUID REFERENCES game_comments(id),  -- for threading
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES game_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  emoji TEXT NOT NULL,
  UNIQUE (comment_id, user_id, emoji)
);
```

Comments are visible to all game participants. Real-time via Supabase's `postgres_changes` subscription on `game_comments` filtered by `game_id`. The existing `subscribeToScores` pattern in `roundsApi.js` is the exact template for implementing `subscribeToComments`.

A comment thread renders in the game detail page below the outcome/standings section. Each comment shows avatar, name, timestamp, and up to 3 emoji reaction counts. Tapping an emoji toggles your reaction.

### Activity Feed

The existing `activity_feed` table (migration 004) is reused. New `event_type` values are added:

- `game_created` — payload: `{game_id, sport_slug, creator_name}`
- `bet_placed` — payload: `{game_id, bet_type, amount}`
- `game_won` — payload: `{game_id, winner_name, amount}`
- `big_payout` — payload: `{game_id, amount}` — triggered if amount > $50
- `press_accepted` — payload: `{game_id, presser_name, amount}`
- `tournament_joined` — payload: `{tournament_id, player_name}`
- `tournament_win` — payload: `{tournament_id, winner_name, pot_total}`

Feed rendered in GroupDetailPage as a vertical timeline with sport-specific emojis as icons.

### Group Stats

A `group_stats` computed view aggregates from the `games` and `bet_legs` tables:

- Total games played
- Total wagered (sum of all settled bet_legs amounts)
- Biggest single pot (max game pot_total)
- Current win streak per member (consecutive game wins, sorted descending)
- Most active player (most games played)

Rendered as a "Season Stats" card on the GroupDetailPage below the activity feed.

### Head-to-Head Records

The existing `head_to_head` view in migration 004 is already the correct foundation. It needs one modification: add a `group_id` join so it is scoped per group (not global). The GroupDetailPage gets a "Rivalries" section that shows each pair's record: "Ethan 4 — Jake 2" with total net winnings.

### Share Card

After a game settles, the winner sees a shareable card that can be exported as an image (using the `html-to-image` library in Capacitor's web view, or the `@capacitor/share` plugin to share the URL):

```
┌────────────────────────────────┐
│  RATPAC                        │
│  ──────────────────────────    │
│  ⛳ Golf — Nassau               │
│                                │
│  ETHAN WON                     │
│  $120                          │
│                                │
│  vs Jake, Sam, Chris           │
│  Royal Melbourne — 9 Mar 2026  │
│                                │
│  "2 up with 2 to play 🤣"      │
│  players.app/join/ABC123       │
└────────────────────────────────┘
```

Generated as a 1080x1080 styled div, captured with `html-to-image` or `@capacitor/share`.

### Tournament Leaderboard

Within a group with an active tournament, the GroupDetailPage shows a leaderboard tab: rank, player name, points (or net $), games played, last game result. Real-time via Supabase subscription on `tournament_entries`.

---

## 7. Wallet and Payments — Complete Spec

### Top-Up (existing infrastructure extended)

The existing `wallet-topup` edge function creates a Stripe PaymentIntent with `automatic_payment_methods: { enabled: true }`. This already covers card, Apple Pay, and Google Pay on supported devices via the Stripe Payment Element. No changes needed to the edge function. The frontend `TopUpForm` component needs to be updated to use `@stripe/react-stripe-js` `PaymentElement` (not a card-only element) to surface Apple Pay and Google Pay options automatically.

### Escrow Mechanics

**When funds are locked:**
- When the game host taps "Start game" (status changes from `setup` to `locked`).
- This fires the `game-lock` edge function which calls `hold_funds(user_id, total_exposure, game_id)` for every participant.
- `total_exposure` = sum of all bet legs the player is on the hook for. For a Nassau at $10/leg, total_exposure = $30.

**Insufficient balance at lock time:**
- If any participant has insufficient balance, the game cannot lock.
- The host sees: "Jake needs to top up $20 before the game can start."
- A push notification fires to Jake: "Add funds to join [game name]."
- The 30-minute grace window: if Jake tops up within 30 minutes, the game auto-locks.
- After 30 minutes: the host is notified and can either wait, remove Jake, or cancel the game.

**When funds are released:**
- `bet-settle` edge function calls `release_escrow_to_winner` for each settled bet leg.
- For a push/tie: `refund_escrow` fires for both parties.
- The winner's wallet balance updates in real time via Supabase's realtime subscription.
- A push notification fires: "$40 landed in your wallet."

### Auto-Settle Sequence (exact steps)

1. Declaration confirmed (consensus reached or 2hr timeout).
2. `bet-settle` edge function invoked with `{game_id, declaration_id}`.
3. Function queries `outcome_declarations` for the confirmed winner.
4. For each `bet_leg` in the bet:
   a. Calls `release_escrow_to_winner(winner_id, loser_id, leg_amount, bet_id)`.
   b. Updates `bet_legs.status = 'settled'`, `bet_legs.winner_id`, `bet_legs.settled_at`.
5. Updates `bets.status = 'settled'`.
6. Updates `games.status = 'complete'`.
7. Inserts `activity_feed` record with `event_type = 'game_won'`.
8. Fires push notifications to all participants.
9. If game is part of a tournament, calls `tournament-update-standings(tournament_id, game_id)`.

### Cash Game Mode Flow

In cash game mode (`game_mode = 'cash'`), the `hold_funds` and `release_escrow_to_winner` DB functions are bypassed. Instead, after declaration is confirmed:

1. `calculate_cash_debts(game_id)` DB function runs.
2. Net debts are calculated (e.g. Ethan owes Jake $40, Sam owes Ethan $15).
3. `cash_debts` table is populated.
4. Each debtor receives a push: "You owe Jake $40 from [game name]." with a "Pay via PayID" button.
5. The PayID button opens `payid://pay?amount=40&payid=0411234567&description=RATPAC+golf`.
6. When a debt is marked settled (either party taps "Mark paid"), the `cash_debts.settled_at` is updated.

### Subscription Billing

**$4.99/month via Stripe, 1-month free trial.** The existing `subscriptions` table and `handle_new_user` trigger (migration 004) already creates a `trialing` subscription row on signup with `trial_ends_at = NOW() + INTERVAL '1 month'`.

**Missing edge functions to implement:**
- `subscription-create` — Creates a Stripe Customer + Subscription with a 1-month trial period. Returns a Stripe Checkout Session URL or Payment Intent.
- `subscription-cancel` — Cancels the Stripe subscription at period end. Updates `subscriptions.status = 'canceled'`.
- `webhook-stripe` needs new handlers for: `customer.subscription.trial_will_end` (fire 3-day warning push), `customer.subscription.deleted` (update subscriptions.status), `invoice.payment_failed` (push notification + grace period).

**Subscription gate:** The `ProtectedRoute` component needs a subscription check. Any route under `/app/*` except `/app/wallet` and `/app/subscribe` should redirect to `/app/subscribe` if `profile.subscription_status === 'past_due'` or `'canceled'`. The subscription gate fires for new game creation and bet creation, not for viewing existing games (so users can still see their history and settle disputes even with lapsed subscription).

### Withdrawal

The existing `wallet-withdraw` + `webhook-airwallex` edge functions are complete. No KYC required per product spec. However, per legal requirements (see section 9), a soft AML limit should be implemented: flag withdrawals > $5,000 AUD for manual review (hold in `pending` status rather than auto-processing). This is handled by adding an `aml_flagged` boolean to `withdrawal_requests`.

### Transaction Ledger

All wallet movements use the existing `wallet_transactions` table. New `type` values added:

| type | Meaning |
|---|---|
| `topup` | Card / Apple Pay / Google Pay top-up |
| `withdrawal` | Bank transfer out |
| `bet_escrow` | Funds locked for a bet (negative) |
| `bet_win` | Bet won (positive) |
| `bet_refund` | Bet cancelled or disputed (positive) |
| `subscription_fee` | $4.99 monthly (handled by Stripe, recorded on webhook) |
| `tournament_entry` | Tournament buy-in held (negative) |
| `tournament_win` | Tournament payout (positive) |
| `press_escrow` | Nassau press bet locked (negative) |

---

## 8. Tournament Mode — Full Spec

### Tournament Creation

Any group admin can create a tournament. Creation wizard (3 steps):

1. **Setup:** Name, sport, start/end date (or fixed rounds count), entry fee per player, per-game fee (optional), scoring method (points or net winnings).
2. **Payout structure:** Presets: Winner takes all (100%), Top 2 (70/30), Top 3 (60/30/10). Or custom percentage split.
3. **Confirm:** Summary card, "Create Tournament" button. Creator's entry fee is escrowed immediately.

Other group members see a "Tournament: [name] — Join for $X" banner in the group feed. They tap to join and their entry fee is escrowed.

**Settings fields:**

| Field | Options | Default |
|---|---|---|
| Duration | Fixed end date / Fixed rounds | Fixed end date |
| Scoring | Points / Net winnings | Points |
| Entry fee | $0–$500 | $20 |
| Per-game fee | $0–$50 | $0 |
| Min players | 2–8 | 2 |
| Max players | 2–8 | 4 |
| Payout | Winner takes all / Top 2 / Top 3 / Custom | Top 3 |

### Pot Accumulation

Tournament pot = `(entry_fee * player_count) + (game_fee * completed_games_count)`. Both accumulate in `tournaments.pot_total`. When a tournament-linked game is completed, the `tournament-update-standings` edge function also deducts `game_fee` from each player's wallet and adds to `tournaments.pot_total`.

### Scoring

**Points-based (recommended default):**
- Win: 3 points
- Draw/push: 1 point
- Loss: 0 points
- Bonus: +1 point for winning by 2+ strokes/sets/frames (sport-specific)
- Tiebreaker: net dollar winnings

**Net winnings:**
- No points. Leaderboard = total net winnings across all tournament games.

### Player Drop-Out

If a player leaves a group mid-tournament or their subscription lapses:
- Their entry fee **stays in the pot** (non-refundable, displayed in tournament T&Cs).
- Their pending games are marked as walkovers — opponent gets full points.
- Their existing completed results remain in the standings.

### Auto-Press in Tournament

Press bets interact with tournament scoring at the game level, not the tournament level. A press creates an additional bet leg within the game. That game's total outcome (including presses) determines the tournament standing update. The tournament standings show the net result of each game including all presses.

### Payout Trigger

**Automatic:** When `end_date` passes, a Supabase cron job fires `tournament-payout` at midnight AEST.

**Manual override:** Group admin can tap "End tournament early" (requires confirmation from 50% of active players).

The `tournament-payout` edge function:
1. Queries final standings.
2. For each payout tier: calls `release_escrow_to_winner` equivalent for tournament pot.
3. Marks `tournaments.status = 'complete'`.
4. Fires push to all: "[Tournament name] is over! Ethan wins $240."
5. Posts to activity feed: `tournament_win` event.

---

## 9. Legal Risks (Australia)

This is the most critical section of the plan. Get independent legal advice before launch.

### Interactive Gambling Act 2001 (IGA) — Primary Risk

The IGA is the primary federal law governing online gambling in Australia. Section 15 prohibits providing an "interactive gambling service" to Australian customers without a licence. The key question is whether RATPAC is an "interactive gambling service."

**Definition of interactive gambling service:** A service where a "game" is played and the outcome involves winning or losing money, conducted online. "Game" is defined broadly. P2P sports wagering between friends conducted via a mobile app almost certainly falls within this definition.

**The Social Gambling Argument — Substantial Risk.** Some commentators argue that private social wagering between friends is exempt. However, there is no explicit statutory exemption for friend-group P2P wagering in the IGA. The social gambling exemptions that exist in state legislation (e.g. Victoria's Gambling Regulation Act 2003 s 2.3.7, NSW Unlawful Gambling Act 1998 s 10) apply to in-person games in a private residence. An app that charges a subscription fee, holds funds in escrow, and processes payments via Stripe almost certainly takes this outside any social gambling exemption.

**Charging $4.99/month is a red flag.** Any commercial element — subscription, house cut, platform fee — significantly increases regulatory risk. Operators of gambling services require a licence under IGA and relevant state laws.

**State-by-state breakdown:**

| State | Relevant law | Social gambling exemption | Notes |
|---|---|---|---|
| NSW | Unlawful Gambling Act 1998 | Private premises, no house profit | App does not qualify |
| VIC | Gambling Regulation Act 2003 | Private residence exemption | App does not qualify |
| QLD | Wagering Act 1998 + Liquor Act | Very limited exemptions | High risk |
| WA | Gambling Commission Act 2024 | No meaningful app exemption | High risk |
| SA | Lottery and Gaming Regulations | Social gambling definition narrow | High risk |
| TAS | Gaming Control Act 1993 | Narrow | High risk |
| ACT | Gambling and Racing Control Act | Limited | High risk |
| NT | Racing and Betting Act | Racing-focused, limited | High risk |

**Practical risk assessment:** A small friends-app operating below regulators' radar may operate for some time without enforcement. However, App Store presence (especially the required "real money gambling" declaration on Google Play) makes it visible. ACMA (Australian Communications and Media Authority) actively monitors and takes enforcement action.

### AML/CTF Obligations

RATPAC processes financial transactions and holds funds in escrow. Under AUSTRAC's Anti-Money Laundering and Counter-Terrorism Financing Act 2006, a "remittance" service or "gambling service" may be a reporting entity required to:
- Enrol with AUSTRAC
- Conduct customer due diligence (KYC)
- Report suspicious matters (SMRs)
- Report international fund transfers
- Maintain transaction records for 7 years

The "no KYC" product decision creates AML risk. At minimum, the platform should implement:
- Soft transaction limits ($2,000/day, $10,000/month) with manual review above
- Flagging for structuring patterns (multiple sub-$500 transactions within 24 hours)
- A basic suspicious matter reporting process

### Age Verification Requirements

The DOB entry + 18+ checkbox flow described in the product spec is the minimum. However, given the gambling context, stronger verification is legally advisable. What existing operators do:
- **Sportsbet:** Full ID verification (driver's licence or passport OCR scan) before first deposit
- **BetEasy/Ladbrokes:** ID + proof of address for accounts above $500 lifetime deposits
- **TAB:** Verified by Credit Bureau checks

For RATPAC MVP, the plan specifies DOB entry + checkbox. Legal counsel should advise whether this is sufficient or whether the platform needs ID verification at sign-up or at first wallet top-up.

### Recommended Legal Structure

1. **Engage Australian gambling law specialists** (e.g. Addisons, Minter Ellison, Dentons) before launch.

2. **Explore the Northern Territory licence path.** NT is the most accessible Australian jurisdiction for online gambling licences. The NT Government's Licensing NT framework issues online gambling licences. This would make the product legal nationally. Annual licence fees start at approximately $50,000 AUD.

3. **Alternative: Restructure as virtual credits.** If real money is operationally risky pre-licence, the MVP could launch with an in-app virtual currency ("RATPAC coins"). Coins are purchased via Stripe but not directly redeemable for cash — they can only be gifted to friends via PayID settlement outside the app. This takes the app outside the IGA's definition but the commercial value of coins makes this a grey area. This is the path DraftKings used in its early US days before daily fantasy was legalised.

4. **Operational safeguards regardless of path:**
   - Prominent "18+ only" messaging on all marketing and app store listings
   - Problem gambling helpline (Gambling Help: 1800 858 858) linked in the app footer and settings
   - Self-exclusion feature (disable bet creation for a cooling-off period)
   - Deposit limits (daily/weekly/monthly, user-set)
   - Session time notifications
   - Reality check pop-up after 60 minutes of app use
   - Link to National Self-Exclusion Register (BetStop) if the operator obtains a licence

5. **Terms of Service** must include: jurisdiction restrictions (18+ only, user certifies they are in a jurisdiction where private social gambling is legal), operator is not a bookmaker, P2P nature of all bets.

---

## 10. Age Verification and Responsible Gambling

### DOB Gate and 18+ Flow

**Onboarding flow (additions to existing `OnboardingPage.jsx`):**

Step 1 (existing): Name entry.
Step 2 (existing): Phone OTP.
Step 3 (new): "How old are you?" — date picker defaulting to 18 years ago. If DOB indicates under 18: hard block screen "You must be 18 or older to use RATPAC. This app involves real-money wagering." Cannot proceed. DOB is stored in `profiles.dob`.
Step 4 (new): Terms screen with scrollable Terms of Service (must scroll to bottom before checkbox activates). Three checkboxes (all mandatory):
  - "I am 18 years or older"
  - "I understand this app involves real-money wagering between friends"
  - "I have read and agree to the Terms of Service and Privacy Policy"

All three checkboxes confirmed at `profiles.age_verified = true`, `profiles.terms_accepted_at = NOW()`.

### Responsible Gambling Features

**Deposit limits (Phase 1 MVP):**

A `responsible_gambling_settings` table:
```sql
CREATE TABLE responsible_gambling_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  daily_deposit_limit NUMERIC,
  weekly_deposit_limit NUMERIC,
  monthly_deposit_limit NUMERIC,
  self_exclusion_until TIMESTAMPTZ,
  cooling_off_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The `wallet-topup` edge function checks these limits before creating a Stripe PaymentIntent. If the limit is exceeded: return 400 with `{"error": "deposit_limit_exceeded", "limit": 100, "period": "daily"}`.

**Self-exclusion:** User taps "Take a break" in Settings. Options: 24 hours, 7 days, 1 month, 6 months, permanent. Sets `self_exclusion_until`. During exclusion: can view history and wallet balance but cannot create games, place bets, or top up wallet. Can still withdraw funds.

**Cooling-off period:** 24-hour cooling off before a self-exclusion can be reduced (cannot immediately undo a 7-day break).

**Mandatory disclosures in app:**

- Settings page footer: "Gambling Help 1800 858 858 — free, confidential counselling."
- Wallet page banner (subtle, not intrusive): "Gamble responsibly. Set limits."
- Post-game "big win" notification includes a small responsible gambling reminder once per 30 days.

**References from AU operators:**
- Sportsbet shows cumulative spend summaries on their account page monthly.
- TAB requires mandatory breaks after 3 hours of continuous activity.
- All licensed operators link to BetStop national self-exclusion register.

---

## 11. Database Schema Changes

### Tables to Rename

`rounds` → `games`. This is a conceptual rename. Migration: `ALTER TABLE rounds RENAME TO games;` plus update all foreign key references.

### New Tables Required

```sql
-- 005_ratpac_wagering_pivot.sql

-- Outcome declarations (replaces score-based settlement)
CREATE TABLE outcome_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  bet_id UUID REFERENCES bets(id),
  declarer_id UUID NOT NULL REFERENCES profiles(id),
  declared_winner_id UUID REFERENCES profiles(id),
  declared_winner_team TEXT CHECK (declared_winner_team IN ('A','B')),
  is_push BOOLEAN DEFAULT false,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','disputed','overridden','auto_confirmed')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '2 hours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Confirmation/dispute responses
CREATE TABLE declaration_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES outcome_declarations(id) ON DELETE CASCADE,
  confirmer_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (action IN ('confirm','dispute')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (declaration_id, confirmer_id)
);

-- Game disputes (escalated)
CREATE TABLE game_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id),
  declaration_id UUID REFERENCES outcome_declarations(id),
  opened_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','resolved_winner_a','resolved_winner_b','resolved_refund','admin_resolved')),
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cash game debts
CREATE TABLE cash_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  bet_id UUID REFERENCES bets(id),
  debtor_id UUID NOT NULL REFERENCES profiles(id),
  creditor_id UUID NOT NULL REFERENCES profiles(id),
  amount NUMERIC(10,2) NOT NULL,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Game comments (trash talk)
CREATE TABLE game_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  parent_id UUID REFERENCES game_comments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES game_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  emoji TEXT NOT NULL,
  UNIQUE (comment_id, user_id, emoji)
);

-- Tournaments
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sport_id UUID REFERENCES sports(id),
  name TEXT NOT NULL,
  entry_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  game_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  scoring_method TEXT NOT NULL DEFAULT 'points'
    CHECK (scoring_method IN ('points','net_winnings')),
  payout_structure JSONB NOT NULL DEFAULT '[{"rank":1,"pct":100}]',
  start_date DATE NOT NULL,
  end_date DATE,
  rounds_count INT,
  min_players INT NOT NULL DEFAULT 2,
  max_players INT NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'registration'
    CHECK (status IN ('registration','active','complete','cancelled')),
  pot_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tournament_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  points INT NOT NULL DEFAULT 0,
  net_winnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  games_played INT NOT NULL DEFAULT 0,
  games_won INT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, user_id)
);

CREATE TABLE tournament_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id),
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, game_id)
);

-- Device tokens for push notifications
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

-- Notification queue (for batched notifications)
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Responsible gambling settings
CREATE TABLE responsible_gambling_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  daily_deposit_limit NUMERIC,
  weekly_deposit_limit NUMERIC,
  monthly_deposit_limit NUMERIC,
  self_exclusion_until TIMESTAMPTZ,
  cooling_off_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Modifications to Existing Tables

```sql
-- games (formerly rounds)
ALTER TABLE games
  ADD COLUMN game_mode TEXT NOT NULL DEFAULT 'wallet'
    CHECK (game_mode IN ('wallet','cash')),
  ADD COLUMN declaration_deadline TIMESTAMPTZ,
  ADD COLUMN locked_at TIMESTAMPTZ,
  ADD COLUMN outcome_config JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN tournament_id UUID REFERENCES tournaments(id);

-- Remove golf-only columns (keep for backward compat, just stop populating)
-- course_id becomes optional (venue_id is the replacement)
-- format becomes sport-specific config in outcome_config JSONB

-- profiles
ALTER TABLE profiles
  ADD COLUMN dob DATE,
  ADD COLUMN age_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN notification_quiet_from TIME DEFAULT '22:00',
  ADD COLUMN notification_quiet_until TIME DEFAULT '08:00';

-- bets — add game_mode passthrough and press tracking
ALTER TABLE bets
  ADD COLUMN is_press BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN parent_bet_id UUID REFERENCES bets(id),
  ADD COLUMN press_threshold INT DEFAULT 2;  -- holes down to suggest press

-- wallet_transactions — add tournament type
ALTER TABLE wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN (
    'topup','withdrawal','bet_escrow','bet_win','bet_refund',
    'subscription_fee','tournament_entry','tournament_win','press_escrow'
  ));
```

### Tables to Drop or Archive

- `scores` — drop after data migration (no longer core). Keep if golf optional scoring is implemented in Phase 2.
- `courses` — repurpose as a subset of `venues` (golf venues). Either merge or leave and stop creating new records.
- `dot_events` — drop. Golf-specific, no longer needed pre-scoring implementation.
- `wolf_decisions` — drop. Wolf is now a structured custom bet with host-declared outcome.

---

## 12. Phased Build Roadmap

### Phase 1 — Launch MVP

**Goal:** Submit to App Store and Google Play. Charge $4.99/month. Support golf, tennis, pickleball, pool wagering between friends. Real money wallet mode.

**Every page needed:**

| Page | Route | Status |
|---|---|---|
| LandingPage | `/` | Rewrite copy for wagering platform |
| LoginPage | `/login` | Keep (phone OTP) |
| SignupPage | `/signup` | Add DOB + age gate |
| OnboardingPage | `/onboarding` | Add terms checkboxes |
| DashboardPage | `/app` | Rewrite: games-first layout |
| NewGamePage | `/app/games/new` | Rewrite NewRoundPage — 5-step wizard |
| GameDetailPage | `/app/games/:id` | Rewrite ActiveRoundPage — outcome-declaration tabs |
| DeclareOutcomePage | `/app/games/:id/declare` | New — outcome declaration flow |
| BetsPage | `/app/bets` | Keep (minor updates) |
| BetDetailPage | `/app/bets/:id` | Rewrite: show declaration status |
| NewBetPage | `/app/games/:id/bets/new` | Rewrite NewBetOfferPage |
| GroupsPage | `/app/groups` | Keep (minor updates) |
| GroupDetailPage | `/app/groups/:id` | Add activity feed, stats, head-to-head |
| JoinGamePage | `/join/:code` | New — deep link landing |
| WalletPage | `/app/wallet` | Keep (add Apple/Google Pay in PaymentElement) |
| ProfilePage | `/app/profile` | Add responsible gambling settings |
| SubscribePage | `/app/subscribe` | Implement subscription-create edge function |
| ResponsibleGamblingPage | `/app/profile/responsible-gambling` | New |
| AdminShell | `/admin` | Keep |
| AdminDashboard | `/admin` | Add dispute queue card |
| AdminUsersPage | `/admin/users` | Keep |
| AdminBetsPage | `/admin/bets` | Keep |
| AdminDisputesPage | `/admin/disputes` | New |
| AdminTransactionsPage | `/admin/transactions` | Keep |

**Every edge function needed:**

| Function | JWT | Action |
|---|---|---|
| game-create | Yes | Replace round-create |
| game-lock | Yes | Lock funds for all participants |
| game-join | Yes | Join via invite code, add to round_participants |
| declare-outcome | Yes | Submit outcome declaration |
| confirm-declaration | Yes | Confirm or dispute an outcome |
| bet-create | Yes | Rewrite existing — all sport types |
| bet-settle | Yes | Rewrite existing — declaration-based |
| bet-press | Yes | Create press bet on Nassau |
| wallet-topup | Yes | Keep (minor: add rg limit check) |
| wallet-withdraw | Yes | Keep (add aml_flagged soft limit) |
| webhook-stripe | No | Keep + add subscription lifecycle handlers |
| webhook-airwallex | No | Keep |
| subscription-create | Yes | New — Stripe subscription with trial |
| subscription-cancel | Yes | New |
| send-push-notification | Internal | New — FCM + APNs dispatch |
| send-push-on-declaration | Internal | Triggered by declaration INSERT (DB webhook or cron) |

**Cut from existing code:**

- `round-score` edge function — deleted
- `round-complete` edge function — replaced by `declare-outcome` + `confirm-declaration`
- `bet-match` edge function — logic absorbed into `bet-create`
- `bet-offer` edge function — logic absorbed into `bet-create`
- HoleScoringPage, Scorecard component, AdminValidationPanel component
- `course-search` edge function — replaced by simple venue text entry for non-golf; golf course search can be re-enabled in Phase 2 as enhancement
- `settlement.js`, `handicap.js` utils — deleted
- `scores`, `dot_events`, `wolf_decisions` tables — dropped

**Migration file needed:** `005_ratpac_wagering_pivot.sql` containing all new tables, column additions, and drops listed in Section 11.

**App Store submission checklist:**
- Privacy policy URL (required)
- Age rating: 17+ (gambling and real money)
- Privacy manifest (iOS 17 required for all App Store submissions)
- Apple Pay entitlement in Xcode project
- Capacitor's `Info.plist` entries: camera (QR), push notifications
- Google Play: gambling declaration + licence review (or remove AU restriction — which would require a worldwide unlicensed launch, not recommended)
- Google Play's `INTERNET`, `RECEIVE_BOOT_COMPLETED`, `VIBRATE` permissions in AndroidManifest

**Env vars needed beyond existing:**

```
VITE_STRIPE_PUBLISHABLE_KEY         (existing)
VITE_STRIPE_PRICE_ID_MONTHLY        new — $4.99/month price
VITE_FIREBASE_CONFIG                new — FCM config for web push fallback
APNS_KEY_ID                         new — Apple push key
APNS_TEAM_ID                        new — Apple team ID
APNS_PRIVATE_KEY                    new — .p8 key contents
FCM_SERVER_KEY                      new — Firebase server key
AIRWALLEX_CLIENT_ID                 (existing)
AIRWALLEX_API_KEY                   (existing)
STRIPE_SECRET_KEY                   (existing)
STRIPE_WEBHOOK_SECRET               (existing)
```

### Phase 2 — Growth (Months 1-3 Post-Launch)

**Tournament mode** — Add tournaments, tournament_players, tournament_games tables. New pages: TournamentDetailPage, CreateTournamentPage, TournamentLeaderboardPage. New edge functions: tournament-create, tournament-join, tournament-update-standings, tournament-payout. Admin: AdminTournamentsPage.

**Trash talk / comments** — game_comments table is already in migration 005. Phase 2 adds the UI: CommentThread component in GameDetailPage, push notification on new comment.

**Cash game mode** — cash_debts table in migration 005. Phase 2 adds: CashGameBadge, DebtSummaryCard, PayIDDeepLink component.

**Nassau auto-press pop-up** — Requires the `bet-press` edge function (Phase 1) plus a triggering mechanism. In Phase 2: after each Nassau declaration, the system checks if a player is down by 2 or more. If so, fires a push notification with a deep link to the press acceptance screen.

**Share card** — Post-game shareable image. Uses `html-to-image` + `@capacitor/share`.

**Golf optional scoring** — Re-introduce HoleScoringPage as optional for golf games. Scores are informational only (do not auto-settle). Press detection can use scores as a trigger if entered.

**Group stats dashboard** — `group_stats` materialized view. Rendered in GroupDetailPage as a "Season Stats" tab.

**More sports** — Add Darts as a 5th launch sport. Easy to add since the format is identical to pool (frame/leg winner).

### Phase 3 — Scale (6+ Months)

**Additional sports** — Add AFL, Cricket, Basketball with sport-specific wager types (quarter-by-quarter for AFL/basketball, over-by-over for cricket).

**Advanced user analytics** — Personal stats page: win rate, total wagered, biggest win, favourite sport, win streak graph. Uses Chart.js or Recharts in the web view.

**Group challenges** — One group challenges another group. Inter-group tournaments. Requires a `group_challenges` table and a new invite flow.

**Licence application** — If the platform reaches $100k+ in monthly wagered volume, engage Licensing NT for a Northern Territory online gambling licence. This unlocks: Google Play unrestricted listing, marketing partnerships, Stripe's higher-risk merchant category, and AML/CTF compliance framework.

**KYC for larger withdrawals** — If pursuing an NT licence, integrate Veriff or Stripe Identity for ID verification. Triggered at first withdrawal above $500.

**Referral program** — Invite 3 mates, get 1 month free. Tracked via `profiles.referred_by` (column already exists on the latr project, same pattern applies here).

---

## Critical Files for Implementation

- `/Users/ethanrennie/Desktop/stroke/supabase/migrations/001_initial_schema.sql` — Core schema foundation to extend; contains the `hold_funds`, `release_escrow_to_winner`, and `refund_escrow` DB functions that are directly reused in the new declaration-based settlement flow.

- `/Users/ethanrennie/Desktop/stroke/supabase/functions/bet-settle/index.ts` — The settlement logic that must be completely rewritten to accept a `declaration_id` instead of computing from scores; this is the most complex single function to modify.

- `/Users/ethanrennie/Desktop/stroke/src/pages/ActiveRoundPage.jsx` — The game detail page that becomes `GameDetailPage.jsx`; it already has the correct tab structure, participant display, real-time subscription, and QR invite modal — all of which are reused; the score tab is replaced by outcome declaration.

- `/Users/ethanrennie/Desktop/stroke/supabase/migrations/004_ratpac_subscription.sql` — Contains the subscription table, the updated `handle_new_user` trigger, and `activity_feed` + `feed_reactions` tables that all survive intact and are extended in migration 005.

- `/Users/ethanrennie/Desktop/stroke/src/lib/betsApi.js` — The API client that calls every bet-related edge function; it must be extended with `declareOutcome`, `confirmDeclaration`, `createPress`, and updated `settle` method signatures while retaining the existing `create`, `get`, `listForRound` calls.
