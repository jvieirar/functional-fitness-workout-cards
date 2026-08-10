import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo = fileURLToPath(new URL('..', import.meta.url));
const data = JSON.parse(await readFile(join(repo, 'source', 'workouts.json'), 'utf8'));
await mkdir(join(repo, 'docs', 'cards'), { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (pathname === '/favicon.ico') return response.writeHead(204).end();
    const relative = pathname === '/' ? 'source/card-template.html' : pathname.slice(1);
    if (relative.includes('..')) throw new Error('Invalid path');
    const body = await readFile(join(repo, relative));
    response.writeHead(200, { 'content-type': mime[extname(relative)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const port = server.address().port;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const workout of data.workouts) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 2000 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}/source/card-template.html?slug=${workout.slug}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
    const layout = await page.evaluate(() => {
      const card = document.querySelector('#workout-card');
      const cardRect = card.getBoundingClientRect();
      const clipped = [...card.querySelectorAll('.warning, .timing li, .exercise-block, .rest, .card-footer > p')]
        .filter((element) => element.scrollHeight > element.clientHeight + 2 || element.scrollWidth > element.clientWidth + 2)
        .map((element) => ({
          element: element.className || element.tagName,
          client: [element.clientWidth, element.clientHeight],
          scroll: [element.scrollWidth, element.scrollHeight],
          text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80)
        }));
      const escaped = [...card.querySelectorAll('*')].filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < cardRect.left - 2 || rect.top < cardRect.top - 2 || rect.right > cardRect.right + 2 || rect.bottom > cardRect.bottom + 2;
      }).map((element) => element.className || element.tagName);
      const primarySizes = [...card.querySelectorAll('.primary')].map((element) => parseFloat(getComputedStyle(element).fontSize));
      return { clipped, escaped, images: [...document.images].every((image) => image.complete && image.naturalWidth > 0), minimumPrimarySize: Math.min(...primarySizes) };
    });
    if (errors.length || !layout.images || layout.minimumPrimarySize < 72 || layout.clipped.length || layout.escaped.length) throw new Error(`${workout.slug} render rejected: ${JSON.stringify({ errors, layout })}`);
    const output = join(repo, 'docs', 'cards', `${workout.slug}-v1.png`);
    await page.locator('#workout-card').screenshot({ path: output });
    console.log(`Rendered ${workout.slug}-v1.png · primary text ${layout.minimumPrimarySize}px · no clipping`);
    await page.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
