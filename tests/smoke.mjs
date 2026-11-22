// Smoke test: builds the app against a MOCK Supabase, opens it at phone width and
// checks the things that have broken before. Run:  npm run build:mock && npm run test:smoke
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const PORT = 4173;
if (!existsSync('.mockdist')) { console.error('Run "npm run build:mock" first.'); process.exit(2); }

const server = spawn('npx', ['vite', 'preview', '--outDir', '.mockdist', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

const mk = (i, title, price, category, kind = 'sale', boosted = false) => ({
  id: `00000000-0000-0000-0000-00000000000${i}`, seller_id: `s${i % 3}`, title, price, kind, status: 'active',
  is_boosted: boosted, created_at: new Date().toISOString(), categories: { name: category, slug: category },
  meeting_spots: { name: 'Main Gate' }, listing_photos: [],
});
const LISTINGS = [mk(1, "Gray's Anatomy 40th ed", 45000, 'Books', 'sale', true), mk(2, 'HP Laptop i5', 350000, 'Electronics'),
  mk(3, 'Rice 10kg', 18000, 'Food'), mk(4, 'Navy hoodie', 12000, 'Clothing & Fashion')];

let failed = false;
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch { /* retry */ } await wait(250); }
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  const urls = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|WebSocket/.test(m.text())) errors.push(m.text()); });
  await ctx.route('**/*', route => {
    const u = route.request().url();
    if (u.includes('mock.supabase.co')) {
      urls.push(decodeURIComponent(u));
      let body = '[]';
      if (u.includes('/rest/v1/listings')) body = JSON.stringify(route.request().method() === 'HEAD' ? [] : LISTINGS);
      else if (u.includes('/rest/v1/profiles')) body = JSON.stringify([{ id: 's0', display_name: 'Chikondi', is_verified: true }, { id: 's1', display_name: 'Tadala', is_verified: false }, { id: 's2', display_name: 'M-Tech', is_verified: true }]);
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', 'content-range': '0-3/42' }, body });
    }
    if (/unsplash|cloudinary|fonts\.g/.test(u)) return route.abort();
    return route.continue();
  });

  await page.goto(`http://localhost:${PORT}/`);
  await wait(5500);
  for (const label of [/skip/i, /get started/i]) { const b = page.getByRole('button', { name: label }).first(); if (await b.count()) { await b.click().catch(() => {}); await wait(400); } }
  await wait(1200);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/home.png` });

  check('no uncaught errors on load', errors.length === 0, errors.slice(0, 2).join(' | '));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('no horizontal scroll at 390px', overflow <= 0, `overflow=${overflow}px`);
  const text = (await page.innerText('body')).replace(/\s+/g, ' ');
  check('listings render', /Rice 10kg/.test(text));
  check('hero stats use the real total (42), not page size', /42 active listings/.test(text), text.match(/\d+ active listings?/)?.[0]);
  check('no hardcoded "120+" onboarding counts', !/120\+|80\+/.test(text));
  check('logged-out header shows a Sign in button', (await page.getByRole('button', { name: /^sign in$/i }).count()) > 0);
  const firstCardTop = await page.evaluate(() => document.querySelector('.cf-product-card')?.getBoundingClientRect().top ?? 9999);
  check('first product is visible without scrolling', firstCardTop < 844 - 60, `top=${Math.round(firstCardTop)}px of 844`);
  const sizes = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('button,a,[role=button]').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && (e.closest('.cf-product-card') ? false : (r.height < 36))) out.push(`${(e.getAttribute('aria-label') || e.innerText || e.className).trim().slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`); });
    return out;
  });
  check('no tiny (<36px) buttons outside cards', sizes.length === 0, sizes.join('; '));
  const tinyText = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11).length);
  check('no text under 11px', tinyText === 0, `${tinyText} elements`);
  check('category/sort are sent to the server, not filtered locally', urls.some(u => /order=is_boosted\.desc/.test(u)));

  // Server-side category filter
  const before = urls.length;
  const books = page.getByRole('button', { name: /^books/i }).first();
  if (await books.count()) { await books.click(); await wait(800); }
  check('choosing a category queries the server (categories!inner)', urls.slice(before).some(u => /categories!inner/.test(u)));

  // Card keyboard access
  const card = page.locator('.cf-product-card').first();
  check('product cards are keyboard-focusable buttons', (await card.getAttribute('role')) === 'button' && (await card.getAttribute('tabindex')) === '0');

  // Back button: opening and closing a listing must not strand history
  await page.locator('.cf-product-card').first().click(); await wait(900);
  check('opening a listing puts it in the URL', /[?&]listing=/.test(page.url()), page.url());
  await page.goBack(); await wait(700);
  check('Back closes the listing and clears the URL', !/listing=/.test(page.url()));

  await browser.close();
} catch (e) { console.error(e); failed = true; }
server.kill();
const bad = results.filter(r => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} checks passed`);
process.exit(failed || bad ? 1 : 0);
