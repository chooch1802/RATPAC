# Players PRD Implementation Notes

Source used: `/Users/ethanrennie/Desktop/Players_PRD_v1.docx` (text extracted via `textutil`).

## What is implemented now (MVP shell)
- Expo + React Native TypeScript app with dark theme aligned to PRD.
- Basic auth/onboarding flow with handle and privacy selection.
- Supabase phone OTP auth flow scaffolding (send + verify) with auto-session bootstrap.
- Apple and Google OAuth sign-in flow wired through Supabase + Expo AuthSession.
- Main tab navigation: Feed, Wagers, Create, Profile.
- Wager creation flow with supported activity list and custom activity.
- Subscription gate/paywall when free users attempt to create wager.
- Stripe checkout/manage URL launch wiring from paywall/profile plus Supabase subscription status sync.
- Local store/state skeleton for wagers and feed posts.

## Required next integrations (from PRD)
- Supabase Auth: phone OTP, Apple, Google sign-in.
- Native Apple/Google provider configuration and store credential setup for production release.
- Stripe Billing ($4.99/month) and Stripe Connect KYC on first win payout.
- Stripe webhook-driven subscription table updates (`subscriptions`) and robust server-side entitlement sync.
- Real escrow, settlement, dispute/void lifecycle automation.
- Push notifications for wager lifecycle events.
- Row-level security policies and backend edge functions.

## Explicitly out of scope in this first code pass
- DMs
- Leaderboards
- Sports API result automation
- Platform rake/fee on settlement
