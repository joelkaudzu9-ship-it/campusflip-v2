# Database

`schema.sql` is a reference dump (pg_dump, Postgres 17). `migrations/` holds changes to apply.

## Applying `20261122_security_hardening.sql`

It fixes problems that let any signed-in user (and in some cases any visitor) read every
student's email and phone, make themselves admin, publish listings and boosts without paying,
and call the payment-finalising function directly. Details are at the top of the file.

1. **Deploy the new front-end first.** It reads private data through functions and falls back to
   the old queries if the functions do not exist yet, so deploying first is safe.
2. **Try it on a staging Supabase project** (or a branch database) before production.
3. Run the file in the SQL editor. It is one transaction: it either all applies or none does.
4. Run `tests/seed.sql` then `tests/security_checks.sql` and `tests/rpc_checks.sql` against
   **staging only** (they insert test users). Every line labelled 1-9 must say BLOCKED; every
   line labelled L or X must say ALLOWED / OK, except the ones noted as BLOCKED on purpose.
5. Click through the live app: sign in, post a sale listing, pay, mark sold, edit, report,
   save, open Admin, verify a seller, open Account and the referral screen.
6. Check the Edge Functions (`campusflip-payment`, the PayChangu webhook, `cloudinary-sign`)
   use the **service role** key. They must, because `finalize_campusflip_payment()` is no longer
   callable by signed-in users.

### Behaviour changes to be aware of

- Sellers can no longer set a listing to `active`, boost it, change `expires_at` or `kind`
  themselves. They can mark it `sold` or `removed`, edit text/price/category, and re-submit an
  expired or sold *sale* listing for payment (`pending_payment`). Free kinds (wanted, free, lost
  and found) can be re-activated directly.
- Sellers can no longer create or edit flash deals directly; the payment function switches them on.
- `profiles` is no longer in the realtime publication, so the Account screen will not live-update
  when an admin verifies a shop; it updates on next open.

### Not covered here (do these next)

- Add rate limits / spam controls for free posts (wanted, free, lost and found).
- `increment_listing_views` can be called repeatedly by anyone; add a per-user or per-IP limit.
- Add `UPDATE`/`DELETE` policies if sellers should manage photos (`listing_photos` has insert only).
- Keep this folder current: after each change in the dashboard, export and commit the schema.

## Edge functions (`supabase/functions/`)

- `cloudinary-sign` – signs uploads and restricts them to jpg/jpeg/png/webp (`allowed_formats`).
  **Deploy it together with the frontend**: the client must send `allowed_formats` exactly as signed.
- `campusflip-payment` – hardened: flash-deal price/duration validated before any charge (duration clamped to 1–168h),
  stale inactive deals removed, and a retried referral-credit payment returns the existing success instead of a 409.
  Needs `SUPABASE_SERVICE_ROLE_KEY` (the finalizer is no longer callable by clients).
- `campusflip-paychangu-webhook` / `campusflip-payment-status` need no changes; keep your originals here.
  Deploy the webhook with `verify_jwt = false`.
