# CampusFlip

Campus marketplace for KUHeS students: buy, sell and meet safely. React 18 + Vite PWA on
Cloudflare Pages, with Supabase (Postgres, Auth, Realtime), Cloudinary for photos and
PayChangu mobile money for listing fees.

## Run it

```bash
npm install
cp .env.example .env.local     # fill in the Supabase URL and public key
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run build` | Production build into `dist/` |
| `npm run build:mock` | Build against a fake Supabase (used by the smoke test) |
| `npm run test:smoke` | Opens the mock build at phone width and checks layout, filters, Back button |

For the smoke test you need Playwright's browser once: `npx playwright install chromium`.
If you already have Chromium, set `CHROMIUM_PATH=/path/to/chrome`.

## Layout

```
src/App.jsx              Home feed, header, navigation between screens
src/components/          Screens and dialogs (the big ones load on demand via React.lazy)
src/lib/                 supabase client, back-button stack, image tools, Cloudinary helpers, storage
functions/_middleware.js Cloudflare Pages function: WhatsApp/Facebook link previews for ?listing=<id>
supabase/schema.sql      Reference dump of the database (tables, RLS policies, functions)
supabase/migrations/     SQL migrations. Review before applying; see supabase/README.md
supabase/tests/          SQL checks that prove the security rules hold
tests/smoke.mjs          Browser smoke test
```

## Things worth knowing

- **Where listing fees are enforced:** only on the server. The browser can never mark a listing
  paid; `finalize_campusflip_payment()` does that, and only the service role may call it.
- **Private profile data** (email, phone, `is_admin`, referral credits) is not readable through
  the public API. The app reads it through `get_my_profile()` / `get_referral_stats()` and, for
  admins, `admin_list_profiles()`.
- **Images** are resized in the browser before upload, and delivered through Cloudinary
  transformations (`f_auto,q_auto,w_…`) via `src/lib/cloudinary.js`.
- **Navigation** is a set of overlays with a single Back-button stack (`src/lib/useBackButton.js`).
  An open listing is reflected as `/?listing=<id>`. Moving to a full router is still on the list.
