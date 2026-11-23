// WCAG contrast audit. Opens key screens, measures every visible piece of text against the
// background it actually sits on, and reports pairs below AA (4.5:1, or 3:1 for large text).
// Run: npm run build:mock && node tests/contrast.mjs   (CONTRAST_STRICT=1 makes failures exit 1)
import { chromium } from 'playwright';
import { installMock, startPreview, wait, waitForServer } from './mock.mjs';

const PORT = 4175;
const server = startPreview(PORT);
const origin = `http://localhost:${PORT}`;

const MEASURE = () => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[, /]+/).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const over = (top, bottom) => { const a = top.a + bottom.a * (1 - top.a); if (!a) return { r: 255, g: 255, b: 255, a: 0 }; return { r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a, g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a, b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a, a }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const label = el => { const c = (el.className && el.className.baseVal === undefined ? String(el.className) : '').trim().split(/\s+/).slice(0, 2).join('.'); return `${el.tagName.toLowerCase()}${c ? '.' + c : ''}`; };
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (el.closest('[disabled],[aria-disabled="true"],[aria-hidden="true"]')) continue; // disabled controls and pure decoration are exempt
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    // Walk up to find the background; flag gradients/images as unknown.
    let bg = { r: 255, g: 255, b: 255, a: 0 }, unknown = false, opacity = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      opacity *= +s.opacity;
      if (s.backgroundImage && s.backgroundImage !== 'none') { unknown = true; break; }
      const c = parse(s.backgroundColor);
      if (c && c.a > 0) { bg = over(bg.a ? over(bg, c) : c, { r: 255, g: 255, b: 255, a: 1 }); if (c.a >= 1) { bg.a = 1; break; } }
    }
    if (unknown) {
      // Gradient background: test the text colour against every colour stop and report the worst.
      let n = el, stops = [];
      for (; n && n !== document.documentElement; n = n.parentElement) {
        const bi = getComputedStyle(n).backgroundImage;
        if (bi && bi !== 'none') { stops = (bi.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(c => c && c.a >= 0.5); break; }
      }
      const fgc = parse(cs.color);
      if (!stops.length || !fgc) { out.push({ unknown: true, sel: label(el), text: own.slice(0, 30) }); continue; }
      const worst = Math.min(...stops.map(c => ratio(over({ ...fgc, a: fgc.a * opacity }, { ...c, a: 1 }), { ...c, a: 1 })));
      const sz = parseFloat(cs.fontSize), bd = +cs.fontWeight >= 700;
      const needG = (sz >= 24 || (sz >= 18.66 && bd)) ? 3 : 4.5;
      if (worst < needG) out.push({ sel: label(el), text: own.slice(0, 30), cr: Math.round(worst * 100) / 100, need: needG, fg: cs.color, bg: 'gradient', size: sz });
      continue;
    }
    if (bg.a < 1) bg = over(bg, { r: 255, g: 255, b: 255, a: 1 });
    const fg0 = parse(cs.color); if (!fg0) continue;
    const fg = over({ ...fg0, a: fg0.a * opacity }, bg);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const cr = ratio(fg, bg);
    if (cr < need) out.push({ sel: label(el), text: own.slice(0, 30), cr: Math.round(cr * 100) / 100, need, fg: `rgb(${[fg.r, fg.g, fg.b].map(Math.round)})`, bg: `rgb(${[bg.r, bg.g, bg.b].map(Math.round)})`, size });
  }
  return out;
};

const exp = Math.floor(Date.now() / 1000) + 86400;
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp })}.sig`;
const user = { id: 'u1', email: 'tester@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const session = JSON.stringify({ access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 86400, expires_at: exp, user });

const SCREENS = [
  ['home (signed out)', '/', false], ['listing', '/listing/00000000-0000-0000-0000-000000000001', false],
  ['search', '/search', false], ['account', '/account', true], ['saved', '/saved', true],
  ['my shop', '/shop', true], ['post', '/post', true], ['privacy', '/account/privacy', true],
  ['notifications', '/account/notifications', true], ['settings', '/account/settings', true],
];

let all = [];
try {
  await waitForServer(PORT);
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [name, path, signedIn] of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await installMock(ctx, { urls: [], adminRpc: false });
    await ctx.addInitScript(([s, signed]) => { try { localStorage.setItem('campusflip_onboarded', 'true'); if (signed) localStorage.setItem('sb-mock-auth-token', s); } catch { /* ignore */ } }, [session, signedIn]);
    const page = await ctx.newPage();
    await page.goto(origin + path); await wait(6500);
    const found = await page.evaluate(MEASURE);
    for (const f of found) all.push({ screen: name, ...f });
    await ctx.close();
  }
  await browser.close();
} finally { server.kill(); }

const fails = all.filter(f => !f.unknown);
const unknown = all.filter(f => f.unknown);
const groups = new Map();
for (const f of fails) {
  const key = `${f.fg} on ${f.bg}  (${f.cr}:1, needs ${f.need})`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(f);
}
console.log(`\n${fails.length} text elements below WCAG AA in ${groups.size} colour pairs  (${unknown.length} on gradients/images not measured)\n`);
for (const [key, list] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${String(list.length).padStart(3)} × ${key}`);
  for (const f of list.slice(0, 3)) console.log(`      ${f.screen}: ${f.sel} “${f.text}” ${f.size}px`);
}
if (process.env.CONTRAST_JSON) (await import('node:fs')).writeFileSync(process.env.CONTRAST_JSON, JSON.stringify(fails));
if (process.env.CONTRAST_STRICT && fails.length) process.exit(1);
