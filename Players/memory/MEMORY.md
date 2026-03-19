# RATPAC App - Claude Memory

## Project
- **Location**: `/Users/ethanrennie/Desktop/players-app/`
- **Type**: React Native / Expo mobile app (iOS + Android)
- **Logo**: `/Users/ethanrennie/Desktop/players-app/assets/ratpac-logo.png` — RATPAC brand mark

## Key Commands
- `npm start` — Start Expo dev server
- `npm run ios` — Run on iOS simulator
- `npm run android` — Run on Android
- No test suite configured yet

## Architecture
- **Entry**: `index.ts` → `App.tsx`
- **Navigation**: React Navigation v7 — Root Stack → (Auth Stack | App Stack) → Bottom Tabs (4 tabs + FAB)
- **State**: Zustand store at `src/store/useAppStore.ts`
- **Backend**: Supabase (PostgreSQL + Auth). If env vars unset, falls back to mock data.
- **Payments**: Stripe — subscriptions ($4.99/mo) + Connect for escrow

## File Structure
```
App.tsx                          — Navigation root, mounts modals
src/
  theme.ts                       — Design tokens (colors)
  types.ts                       — TypeScript types (WagerStatus, FeedPost, Wager, etc.)
  data/mock.ts                   — Mock activities, feed, wagers, notifications
  store/useAppStore.ts           — Zustand store (auth, wagers, feed, notifications)
  lib/supabase.ts                — Supabase client (null if env not configured)
  services/auth.ts               — OTP + OAuth auth
  services/subscription.ts       — Stripe subscription
  services/wagers.ts             — Wager CRUD (Supabase or mock fallback)
  components/
    WagerCard.tsx                — Core feed card component
    PaywallModal.tsx             — Subscription bottom sheet
    CreateWagerModal.tsx         — 5-step create wager flow (Modal)
    CustomTabBar.tsx             — Tab bar with center FAB (+)
  screens/
    SignInScreen.tsx             — Phone OTP + Apple/Google OAuth
    OnboardingScreen.tsx         — Handle + privacy choice
    HomeScreen.tsx               — Dashboard (stats, active wagers, feed preview)
    FeedScreen.tsx               — Following feed + For You placeholder
    WagersScreen.tsx             — My wagers with filter chips
    ProfileScreen.tsx            — Profile, stats, wager history
    NotificationsScreen.tsx      — Notification list with unread badges
    SearchScreen.tsx             — Player search + follow
    SettingsScreen.tsx           — Account, subscription, notification prefs
    WagerDetailScreen.tsx        — Full wager detail + confirm/dispute actions
```

## Design System (from PRD)
- **BG Primary**: `#0D0D0D` | **BG Secondary**: `#1A1A1A` | **BG Tertiary**: `#242424`
- **Tab Bar**: `#111111`
- **Accent (Electric Green)**: `#00E676`
- **Destructive/Loss**: `#FF3B3B` | **Pending**: `#FFB300`
- **Text**: Primary `#FFF`, Secondary `#AAA`, Muted `#666`
- **Border**: `#2A2A2A`
- Font variant `tabular-nums` on all currency/number displays
- All currency: 2 decimal places (`toFixed(2)`)

## Navigation Structure
```
RootStack
├── SignIn (unauthenticated)
├── Onboarding (authed but not onboarded)
└── App → AppStack
    ├── Tabs (bottom nav - 4 tabs)
    │   ├── Home
    │   ├── Wagers
    │   ├── Feed
    │   └── Profile
    ├── WagerDetail { wagerId }
    ├── Notifications
    ├── Search
    └── Settings
```
FAB (+) in center of tab bar → sets `showCreateWager` in store → `CreateWagerModal` at root.

## Wager Lifecycle
PENDING → ACTIVE → AWAITING_RESULT → DISPUTED/SETTLED → VOIDED/EXPIRED

## Env Vars (.env)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EXPO_PUBLIC_STRIPE_CHECKOUT_URL=
EXPO_PUBLIC_STRIPE_MANAGE_SUBSCRIPTION_URL=
```

## PRD Status (P0 features)
- ✅ Auth (Phone OTP, Apple, Google)
- ✅ Onboarding (handle, privacy)
- ✅ Subscription gate/paywall
- ✅ Wager CRUD + status system
- ✅ Activity list (Golf, Tennis, Table Tennis, Pickleball, Pool, Darts, Custom)
- ✅ Feed with reactions (fire, 100, laughing, shocked)
- ✅ Notifications system (in-app)
- ✅ Premium dark UI matching design system
- ✅ Multi-step Create Wager modal (5 steps)
- 🔲 Supabase Realtime subscriptions (wager status live updates)
- 🔲 Push notifications (Expo Notifications + APNs/FCM)
- 🔲 Stripe Connect KYC for payouts
- 🔲 Teams feature
- 🔲 RLS (Row Level Security) on Supabase tables
- 🔲 Age verification (18+ gate)
