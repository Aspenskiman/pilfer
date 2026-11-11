# Pilfer launch runbook

Branch: `launch`. Nothing here has been run against the live database or a
browser yet — the rehearsal in step 6 is the first real test.

## Order matters

1. **Back up** — Supabase dashboard → Database → Backups (or export the 7 tables).
2. **Run the migration** — paste `supabase/migrations/004_launch_hardening.sql`
   into the Supabase SQL editor and run it once. It must succeed before the
   new code is deployed (the code calls functions and a `plan` column it adds).
   - If it stops on `party_games_stripe_payment_id_key`, delete duplicate test
     rows that share a `stripe_payment_id` and run it again.
3. **Storage bucket** — Storage → `gift-images` must exist and be public, with
   a policy allowing uploads. Set a file size limit (8 MB) and restrict MIME
   types to `image/*` in the bucket settings.
4. **Environment variables (Vercel → Settings → Environment Variables)**
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` = the real https domain (no trailing slash)
   - `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (live keys)
   - `STRIPE_WEBHOOK_SECRET` (from step 5)
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

- No transactional email, analytics or error tracking wired up yet.
- Themes are stored but do not change the look of the game.
- No embedded video; hosts share the stage screen on their own call.
- Final-swap rule for player 1 is not implemented.
- No automated tests.
