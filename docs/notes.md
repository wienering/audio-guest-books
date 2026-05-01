# Audio Guest Books — Notes & TODOs

## Worker compatibility rule (read before adding `server-only`)

**This has been broken multiple times:** any module in the worker’s import tree
that contains `import "server-only"` will crash the Railway worker at startup
with `This module cannot be imported from a Client Component module` (the
package treats non-Next contexts as “client-only” errors). The worker is plain
Node.js (`src/worker/index.ts` + BullMQ jobs), not the Next.js server.

**Before adding `import "server-only"` to any file under `src/lib/` or
`src/db/`:**

1. Confirm that file is **not** reachable from `src/worker/index.ts` (directly
   or transitively). High-risk entrypoints: `runRetentionScheduler`,
   `event-mutations`, job processors under `src/worker/jobs/`, `queue`,
   `redis`, `r2`, `email`, **complimentary subscription expiry**
   (`comp-subscription-expiry-worker` → `comp-subscription-revoke-core` →
   **`billing-plan-state`** — these must stay free of `server-only`).
2. Quick audit (PowerShell):  
   `Select-String -Path src/lib/*.ts,src/lib/*.tsx,src/db/*.ts -Pattern 'import "server-only"'`  
   For each matching file, verify it does **not** appear in the worker graph.  
   (**Don’t** paste the literal `import "server-only"` phrase into comments — it will
   false-positive this search.)

**Prefer:** keep shared DB/business logic in modules **without** `server-only`;
add `server-only` only on thin Next.js wrappers (route handlers, RSC loaders)
that pull in Clerk / cookies and never import the worker stack.

Common shared files that must **avoid** `server-only` (historical hotspots):

- `src/lib/r2.ts`, `queue.ts`, `redis.ts`, `email.ts`
- `src/lib/retention-scheduler.tsx`, `event-mutations.ts`, `billing-plan-state.ts`
- `src/lib/comp-subscription-expiry-worker.ts`, `comp-subscription-revoke-core.ts`,
  `comp-subscription-utils.ts`, `admin-audit-write.ts`
- `src/db/grant-features.ts` (reachable via `billing-plan-state`)
- `src/lib/display-audio-files.ts`, `src/lib/app-url.ts` / `host.ts`,
  `clerk-primary-email.ts`, date/format helpers used by retention, `retention.ts`
- Any module imported by webhooks **or** background jobs

When in doubt: `rg -l 'import "server-only"' src/lib/` and trace imports back to
`src/worker/index.ts`.


## Pre-launch design tasks
- [ ] Comprehensive design pass on retail page (after Stage 5 branding integration)
- [x] Marketing site design (apex audioguestbooks.ca) — Stage 13a v1 (Crimson Pro serif + teal accent, plan cards driven by live `getFoundingMemberSpotsRemaining`)
- [ ] Consider hiring designer for a few hours of polish
- [ ] Stage 13a follow-ups: OG image, blog, customer testimonials, marketing analytics (Stage 13b), cookie banner if needed for EU

## Known small issues
- [ ] Page view analytics double-counted (logged in both API route and page component) — Stage 8 cleanup
- [ ] Retail page is functional but design needs improvement before launch

## Future enhancements (post-MVP)
- [ ] Audio file duration extraction (currently null in audio_files table)
- [x] WAV/FLAC/AIFF transcoding for Ultimate tier (Stage 12 — see runbook at bottom)
- [ ] Custom domains for Ultimate tier (yourcompany.com instead of subdomain)

## Stage 5 — Password sessions

Retail unlock cookies (`rgb_retail_<eventId>`) stay valid until they expire (7 days). Changing the event password does **not** revoke existing sessions; there is no “sign everyone out” control yet — add later if hosts need forced resets.

Existing databases seeded before Stage 5 may still grant `remove_powered_by_footer` on **Pro** via `plan_features`; re-run seed after adjusting `seed.ts`, or delete that row from `plan_features` for the Pro plan so only Ultimate keeps the footer-removal feature.

## Decisions deferred
- [ ] Final Pro tier pricing (launching free, will set price later)
- [ ] Final retention notification copy and timing details
- [ ] Custom email template variables list (Stage 7)

## Pre-launch design tasks
- [ ] Comprehensive design pass on retail page (after Stage 5 branding integration)
- [ ] Marketing site design (apex audioguestbooks.ca)
- [ ] Mobile testing once deployed to Railway

## Known small issues
- [ ] Page view analytics double-counted (logged in both API route and page component) — Stage 8 cleanup
- [ ] Retail page is functional but design needs improvement before launch
- [ ] Drizzle snapshot regeneration: run `npx drizzle-kit generate` in a TTY before next migration to reconcile
- [ ] No "kill all sessions" button when password is changed — sessions stay valid for 7 days

## Future enhancements (post-MVP)
- [ ] Audio file duration extraction (currently null in audio_files table)
- [x] WAV/FLAC/AIFF transcoding for Ultimate tier (Stage 12 — see runbook at bottom)
- [ ] Custom domains for Ultimate tier (yourcompany.com instead of subdomain)
- [ ] Drag-to-reorder files (Stage 13 polish)
- [ ] Per-company timezone preference is a future enhancement. Currently all dates default to America/Toronto (constant `APP_TIMEZONE` in `src/lib/date-format.ts`). Storage stays UTC; only display formatting uses the timezone. To override per company, thread a `timezone` argument through the helpers in `src/lib/date-format.ts` and update the analytics day-bucket SQL in `src/lib/analytics-queries.ts`.

## Decisions deferred
- [ ] Final Pro tier pricing (launching free, will set price later)
- [ ] Final retention notification copy and timing details
- [ ] Custom email template variables list (Stage 7)
## Known small issues
- [ ] Threshold for sync vs async bulk download (50 MB / 20 files) is hardcoded — consider making configurable per-plan or via super admin
- [ ] No "kill all retail page sessions" button when password is changed (sessions stay valid for 7 days)
- [ ] Drizzle relational queries with `with: { event: ... }` were causing column errors — pattern is now avoided in favor of explicit joins, but worth a code review pass before launch
- [ ] Worker logs are functional but not centralized — production deployment should send to a real logging service

## Stage 10 — Account deletion (runbook)

Support-only restore **during the 30-day grace period** (before the daily scheduler purges the company):

```sql
UPDATE companies 
SET deleted_at = NULL, hard_delete_after = NULL, deletion_requested_by_user_id = NULL
WHERE id = '<company-uuid>';
```

Stripe: Stage 9 is not integrated yet — if someone on a paid plan deletes their account **before** billing automation exists, manually cancel their subscription in the Stripe dashboard before the `hard_delete_after` date.

Manual Stage 10 verification: disposable company → events/files → delete via `/dashboard/settings/account` → soft-delete + sign-out + slug reserved for new signups → set `hard_delete_after` in the past → trigger retention scheduler → confirm anonymized log row, R2 purge, slug available again.

## Stage 12 — Ultimate transcoding

The BullMQ worker now ships with FFmpeg bundled via the [`ffmpeg-static`](https://www.npmjs.com/package/ffmpeg-static) npm package — **no system FFmpeg install or `FFMPEG_PATH` env var required**, locally or on Railway. Remove `FFMPEG_PATH` from `.env` and Railway env vars; it's no longer read.

Ultimate tier uses seeded feature `audio_transcoding`. WAV/FLAC/AIFF uploads enqueue `transcode-audio`; retail/sync zip/async zip generation prefers the transcoded MP3 when status is succeeded — optional **Download original** on retail when a lossless file remains.
Account deletion UX hardening needed:

Disable Clerk's built-in account deletion in UserButton config (force users through /dashboard/settings/account)
Fix "Return to sign in" link on deletion page to actually call Clerk signOut + redirect
Add /sign-out route or Clerk-managed sign-out URL for emergency exits
Audit middleware: deleted users should be hard-redirected to deletion-status page on EVERY navigation, with a single "Sign out" button there that actually works
## Pre-launch hardening (account deletion flow)
- [ ] Disable Clerk's built-in UserButton "Delete account" option to force users through /dashboard/settings/account
- [ ] Fix "Return to sign in" link on /account-scheduled-for-deletion page (currently doesn't actually sign user out)
- [ ] Add /sign-out route or use Clerk-managed sign-out URL for emergency exits
- [ ] Audit middleware: deleted users should always redirect to deletion-status page on every protected route, with working sign-out

## Pre-launch hardening (transcoding)
- [x] ~~FFMPEG_PATH must be set in production environment~~ — replaced with `ffmpeg-static` (no system dependency, no env var)
- [x] ~~Document FFmpeg requirement in deployment runbook~~ — no longer required
- [x] ~~Consider pre-built FFmpeg binary alternatives~~ — done via `ffmpeg-static`
## Stripe billing follow-ups for production launch

- [ ] Switch to Stripe live mode (currently test): regenerate API keys, webhook secret, recreate products + prices in live mode, update env vars
- [ ] Configure Stripe Tax (if collecting tax)
- [ ] Configure dunning emails in Stripe (or build custom flow)
- [ ] Set up Stripe production webhook endpoint
- [ ] Audit billing emails (subscription created, ended) for tone and accuracy
- [ ] Decide on Pro tier monetization strategy and timing
- [ ] Test "resume canceled subscription" flow if not done already