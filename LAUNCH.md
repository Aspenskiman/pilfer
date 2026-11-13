# Pilfer launch runbook

Branch: `launch`. Nothing here has been run against the live database or a
browser yet — the rehearsal in step 6 is the first real test.

## Order matters

1. **Back up** — Supabase dashboard → Database → Backups (or export the 7 tables).
2. **Migration — DONE Nov 13, 2026.** `004_launch_hardening.sql` was applied to
   the `jamble` Supabase project and verified with a rolled-back self-test
   (join cap, forged tokens, turn order, steal-back, delivery privacy).
3. **Storage bucket — DONE.** `gift-images` is upload-only for clients, 8 MB
   limit, images only.
4. **Environment variables (Vercel → Settings → Environment Variables)**
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` = the real https domain (no trailing slash)
   - `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (live keys)
   - `STRIPE_WEBHOOK_SECRET` (from step 5)
   - Optional but recommended: `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` (error
     tracking), `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`
     (funnel analytics). Both stay switched off until these are set.
5. **Stripe** — Developers → Webhooks → add endpoint
   `https://<domain>/api/stripe/webhook`, event `checkout.session.completed`.
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy.
6. **Supabase Auth** — Authentication → URL Configuration: set Site URL to the
   real domain and add `https://<domain>/auth/callback` to Redirect URLs.
7. **Rehearsal (do not skip)** — 4+ people on real phones, one laptop as stage:
   - free game end to end: join, submit gifts, start, open, steal, lock, recap
   - a second phone tries to join an 11th player on a free game → must be refused
   - one real paid purchase on the cheapest plan → lands on the setup form →
     game shows the right player limit → refund it from the Stripe dashboard
   - close a player's browser mid-game and reopen → they are still in
   - recap: winner sees delivery info for their gift only; host sees all

## What changed on this branch

- Paid checkout now completes (theme and video-link validation fixed) and the
  game is created from the Stripe session directly, so a slow webhook can no
  longer strand a paying host. Webhook is idempotent and fails loudly.
- Pricing: personal (free ≤10, $19 ≤25, $39 ≤50) and work (team $59 ≤25,
  $99 ≤50). Single source: `constants/tiers.ts`.
- Database: clients are read-only. Joining, submitting a gift, starting,
  opening, stealing and reacting all go through checked database functions.
  Player identity is verified by a private session token; the host can act
  for any player. Player caps are enforced in the database.
- Delivery info and session tokens are no longer readable by clients.
- Editing a game can no longer change its status; started games are locked.
- Landing page, Terms and Privacy (drafts — review before relying on them).
- Screens re-sync every 5 seconds as a fallback if a realtime message is missed.

## Known gaps (not launch blockers)

- No transactional email. Error tracking and analytics are wired but off until their keys are set.
- Themes are stored but do not change the look of the game.
- No embedded video; hosts share the stage screen on their own call.
- Final-swap rule for player 1 is not implemented.
- No automated tests.
