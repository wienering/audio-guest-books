# Audio Guest Books — Notes & TODOs

## Pre-launch design tasks
- [ ] Comprehensive design pass on retail page (after Stage 5 branding integration)
- [ ] Marketing site design (apex audioguestbooks.ca)
- [ ] Consider hiring designer for a few hours of polish

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

The BullMQ worker must find **FFmpeg** on PATH (Windows: `choco install ffmpeg`, or set `FFMPEG_PATH` to `ffmpeg.exe`). Railway/production: install FFmpeg in the worker image when you finalize deployment.

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
- [ ] FFMPEG_PATH must be set in production environment (Railway deployment will need FFmpeg in container)
- [ ] Document FFmpeg requirement in deployment runbook
- [ ] Consider pre-built FFmpeg binary alternatives (ffmpeg-static npm package) to avoid system dependency