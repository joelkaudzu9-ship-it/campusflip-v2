// Signed-in screenshots of account screens:  SHOTS=/tmp/shots node tests/shots-account.mjs
import { chromium } from 'playwright';
import { installMock, startPreview, wait, waitForServer } from './mock.mjs';

const PORT = 4175;
const out = process.env.SHOTS || '/tmp/shots';
const server = startPreview(PORT);
try {
  await waitForServer(PORT);
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [name, w, h] of [['phone', 390, 844], ['desktop', 1366, 850]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await installMock(ctx, { urls: [], adminRpc: false });
    const exp = Math.floor(Date.now() / 1000) + 86400;
    const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
    const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp })}.sig`;
    const user = { id: 'u1', email: 'tester@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
    await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
      ['sb-mock-auth-token', JSON.stringify({ access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 86400, expires_at: exp, user })]);
    for (const route of ['account', 'account/settings', 'account/privacy', 'account/notifications', 'shop', 'download', 'help', 'privacy-policy', 'terms']) {
      await page.goto(`http://localhost:${PORT}/${route}`);
      await wait(3500);
      for (const label of [/skip/i, /get started/i]) { const b = page.getByRole('button', { name: label }).first(); if (await b.count()) { await b.click().catch(() => {}); await wait(600); } }
      await wait(800);
      await page.screenshot({ path: `${out}/${name}-${route.replace('/', '-')}.png`, fullPage: false });
    }
    await ctx.close();
  }
  await browser.close();
} finally { server.kill(); }
