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
- [ ] WAV/FLAC transcoding for Ultimate tier (Stage 12)
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
- [ ] WAV/FLAC transcoding for Ultimate tier (Stage 12)
- [ ] Custom domains for Ultimate tier (yourcompany.com instead of subdomain)
- [ ] Drag-to-reorder files (Stage 13 polish)

## Decisions deferred
- [ ] Final Pro tier pricing (launching free, will set price later)
- [ ] Final retention notification copy and timing details
- [ ] Custom email template variables list (Stage 7)