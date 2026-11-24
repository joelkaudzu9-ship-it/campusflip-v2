// Shared test harness: a preview server for the mock build and a fake Supabase.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

export const wait = ms => new Promise(r => setTimeout(r, ms));

export function startPreview(port) {
  if (!existsSync('.mockdist')) { console.error('Run "npm run build:mock" first.'); process.exit(2); }
  const server = spawn('npx', ['vite', 'preview', '--outDir', '.mockdist', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
  return server;
}

export async function waitForServer(port) {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`http://localhost:${port}/`)).ok) return; } catch { /* retry */ } await wait(250); }
}

const mk = (i, title, price, category, kind = 'sale', boosted = false) => ({
  id: `00000000-0000-0000-0000-00000000000${i}`, seller_id: `s${i % 3}`, title, price, kind, status: 'active',
  is_boosted: boosted, created_at: new Date().toISOString(), categories: { name: category, slug: category },
  meeting_spots: { name: 'Main Gate' }, listing_photos: [],
});
export const LISTINGS = [mk(1, "Gray's Anatomy 40th ed", 45000, 'Books', 'sale', true), mk(2, 'HP Laptop i5', 350000, 'Electronics'),
  mk(3, 'Rice 10kg', 18000, 'Food'), mk(4, 'Navy hoodie', 12000, 'Clothing & Fashion')];


/** Routes all Supabase traffic to canned data. `state.urls` collects requests; `state.adminRpc` toggles is_admin. */
export async function installMock(ctx, state) {
  await ctx.route('**/*', route => {
    const u = route.request().url();
    if (u.includes('mock.supabase.co')) {
      state.urls.push(decodeURIComponent(u));
      let body = '[]';
      if (u.includes('/rest/v1/rpc/is_admin')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: String(state.adminRpc) });
      const byId = u.match(/[?&]id=eq\.([0-9a-f-]{36})/);
      if (u.includes('/rest/v1/listings') && byId) body = JSON.stringify(LISTINGS.filter(l => l.id === byId[1]));
      else if (u.includes('/rest/v1/listings')) body = JSON.stringify(route.request().method() === 'HEAD' ? [] : LISTINGS);
      else if (u.includes('/rest/v1/profiles') && byId) body = JSON.stringify({ id: byId[1], display_name: 'Chikondi Phiri', business_name: 'Chikondi Thrift', is_verified: true, created_at: '2026-01-10T00:00:00Z' });
      else if (u.includes('/rest/v1/profiles')) body = JSON.stringify([{ id: 's0', display_name: 'Chikondi', is_verified: true }, { id: 's1', display_name: 'Tadala', is_verified: false }, { id: 's2', display_name: 'M-Tech', is_verified: true }]);
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', 'content-range': '0-3/42' }, body });
    }
    if (/unsplash|cloudinary|fonts\.g/.test(u)) return route.abort();
    return route.continue();
  });

}
