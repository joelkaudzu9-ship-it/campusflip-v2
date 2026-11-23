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
| `npm run lint` | ESLint, zero warnings allowed |
| `npm run build:mock` | Build against a fake Supabase (used by the browser tests) |
| `npm run test:smoke` | 43 browser checks on the mock build: routes and deep links, signed-in/out, Back button, phone/tablet/desktop layout |
| `npm run test:contrast` | Measures WCAG AA contrast of every visible text on the main screens |
| `npm run test:db` | Applies the migration to a throwaway Postgres and replays the attack + legitimate-flow tests |
| `npm test` | lint + build:mock + smoke + contrast (CI also runs `test:db`) |

Browser tests need Playwright's Chromium once: `npx playwright install chromium`.
If you already have Chromium, set `CHROMIUM_PATH=/path/to/chrome`. `test:db` needs PostgreSQL 14+
binaries (`initdb`, `pg_ctl`, `psql`) on the machine.
`npm run test:db -- --update` rewrites the expected results after an intentional change.
GitHub Actions (`.github/workflows/ci.yml`) runs all of this on every push and pull request.

## Layout

```
src/App.jsx              Composition root: state, route guards, wiring (about 350 lines)
src/hooks/               useSession, useFeed, useFlashDeals, useSavedListings, useMarketplaceLive, useAppNav
src/lib/routes.js        The URL table. Every screen has a real address (below)
src/lib/listings.js      Listing queries and mapping (no React)
src/components/home/     Header, hero, filters, flash deals, feed, product card, bottom nav, sign-in modal
src/components/Overlays.jsx   Every full-screen layer, chosen by the URL
src/components/admin/    Admin console: data hook, UI kit, charts, one component per tab
src/tokens.css           Design tokens: colours, spacing, radii. The only place raw colours live
src/desktop.css          Tablet/desktop layout (768px and up). Phones use premium.css
supabase/                schema.sql, migrations, edge functions, SQL tests (supabase/README.md)
tests/                   smoke.mjs, contrast.mjs, shots.mjs (screenshots), mock.mjs (fake Supabase)
functions/_middleware.js Cloudflare Pages function: link previews for /listing/<id>
```

## URLs

| Path | Screen | Needs sign-in |
| --- | --- | --- |
| `/` | Home feed | no |
| `/listing/:id` | A listing (old `/?listing=<id>` links redirect here) | no |
| `/search` | Search | no |
| `/saved`, `/shop`, `/post` | Saved items, My Shop, new post | yes |
| `/account`, `/account/settings`, `/account/notifications`, `/account/privacy` | Account | yes |
| `/admin` | Admin console | admin only |
| `/invite/:code`, `/reset-password` | Invite landing, password recovery | no / recovery link |

Private paths opened while signed out go home and open the sign-in dialog; after signing in you
land where you were headed. Unknown paths go home. Closing a screen you opened directly (a shared
link, a refresh) goes home instead of leaving the site.

## Things worth knowing

- **Where listing fees are enforced:** only on the server. The browser can never mark a listing
  paid; `finalize_campusflip_payment()` does that, and only the service role may call it.
- **Private profile data** (email, phone, `is_admin`, referral credits) is not readable through
  the public API. The app reads it through `get_my_profile()` / `get_referral_stats()` and, for
  admins, `admin_list_profiles()`.
- **Images** are resized in the browser before upload, and delivered through Cloudinary
  transformations (`f_auto,q_auto,w_…`) via `src/lib/cloudinary.js`.
- **Colours** come from `src/tokens.css`. Do not write raw hex colours in components or stylesheets;
  change the token instead. `test:contrast` fails the build if text drops below WCAG AA.
- **Navigation** is React Router. `parseRoute()` in `src/lib/routes.js` maps the URL to a screen and
  `Overlays.jsx` renders it over the home feed, so the feed keeps its scroll position underneath.

## Android app (APK)

The app is a thin Android wrapper around the website (a Trusted Web Activity), so every site deploy updates it.
- Source: `android/`. Build: GitHub → Actions → **Build Android app** → Run workflow. It needs two repository secrets: `ANDROID_KEYSTORE_B64` and `ANDROID_KEYSTORE_PASSWORD`.
- The workflow commits the signed file to `public/downloads/campusflip.apk`, which the `/download` page links to.
- `public/.well-known/assetlinks.json` holds the signing-key fingerprint that lets the app open the site full-screen. **Keep the keystore safe**: with a different key, existing installs cannot be updated.
- If the site address changes, update it in `android/app/src/main/AndroidManifest.xml`, `res/values/strings.xml` and `assetlinks.json`.
