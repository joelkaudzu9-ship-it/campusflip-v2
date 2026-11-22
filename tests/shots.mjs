// Screenshots of key screens at several widths:  SHOTS=/tmp/shots node tests/shots.mjs
import { chromium } from 'playwright';
import { installMock, startPreview, wait, waitForServer } from './mock.mjs';

const PORT = 4174;
const out = process.env.SHOTS || '/tmp/shots';
const server = startPreview(PORT);
try {
  await waitForServer(PORT);
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [name, w, h] of [['phone', 390, 844], ['tablet', 820, 1100], ['desktop', 1366, 850], ['wide', 1920, 1000]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await installMock(ctx, { urls: [], adminRpc: false });
    await page.goto(`http://localhost:${PORT}/`);
    await wait(5000);
    for (const label of [/skip/i, /get started/i]) { const b = page.getByRole('button', { name: label }).first(); if (await b.count()) { await b.click().catch(() => {}); await wait(400); } }
    await wait(1000);
    await page.screenshot({ path: `${out}/${name}-home.png`, fullPage: true });
    await page.goto(`http://localhost:${PORT}/listing/00000000-0000-0000-0000-000000000001`);
    await wait(2500);
    await page.screenshot({ path: `${out}/${name}-listing.png` });
    await ctx.close();
  }
  await browser.close();
} finally { server.kill(); }
