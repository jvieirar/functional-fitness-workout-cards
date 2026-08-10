import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const repo = fileURLToPath(new URL('..', import.meta.url));
const docs = join(repo, 'docs');
const repoName = 'functional-fitness-workout-cards';
const projectPrefix = `/${repoName}/`;
const productionBase = `https://jvieirar.github.io${projectPrefix}`;
const slugs = [
  'morning-mobility',
  'full-body-a',
  'full-body-b',
  'full-body-c',
  'handstand-v-sit',
  'front-lever',
  'pistol-squat',
  'grease-the-groove'
];
const pagePhrases = {
  'morning-mobility': [
    '8–10 min',
    'Crocodile or 90/90 breathing',
    'Cat-camel',
    'Half-kneeling hip-flexor stretch with glute squeeze',
    'Open-book thoracic rotation',
    'Ankle rocks over toes',
    'Deep squat hold with supported breathing',
    'Glute bridge',
    'Scapular wall slides or band pull-aparts',
    'Replace only the deep squat and glute bridge with comfortable walking plus movements previously approved by the physiotherapist',
    'Retain the other comfortable mobility movements'
  ],
  'full-body-a': [
    '36–42 min',
    'Daily mobility shortened to 5 minutes',
    'Front lever block — 7 minutes',
    'No plyometrics because Tuesday badminton follows',
    'Strength superset 1 — 3 rounds',
    'Weighted backpack, ring, or deep-parallette push-up',
    'Strict pull-up or chin-up',
    'strong band row',
    'Strength superset 2 — 2 rounds',
    'Rear-foot-elevated split squat or reverse lunge',
    'Single-leg Romanian deadlift',
    'Side plank, initially without hip dips',
    'Bent-knee calf raise',
    'rated anchor'
  ],
  'full-body-b': [
    '36–42 min',
    'Daily mobility shortened to 5 minutes',
    'Pistol-squat practice — 7 minutes',
    'Thursday only, choose one',
    'Omit after Wednesday badminton and whenever badminton occurs later that day',
    'Do not perform Full-body B lower-body strength immediately before same-day badminton',
    'move Full-body B to Friday, and omit Full-body C',
    'Pike push-up, feet-elevated pike push-up, or wall handstand-push-up progression',
    'Pallof press from a rated anchor or dead bug',
    'short-lever Copenhagen plank',
    'optional six-minute HIIT replaces—not follows—the finisher'
  ],
  'full-body-c': [
    'Saturday only when there is no weekend badminton',
    '36–42 min',
    'Sunday remains a recovery day before Monday Full-body A',
    'Daily mobility shortened to 5 minutes',
    'Front-lever or weakest-skill practice — 7 minutes',
    'No mandatory jumps',
    'Ring dip progression, parallel-bar dip, close-grip push-up, or weighted floor push-up',
    'Step-up on a verified stable surface or reverse lunge',
    'Kettlebell Romanian deadlift, kickstand RDL, or hamstring walkout',
    'bird dog with three-second reach',
    'optional six-minute HIIT replaces the trunk finisher',
    'Omit C after a two-badminton week or if recovery is suboptimal'
  ],
  'handstand-v-sit': [
    '16–25 min',
    '6–8 minutes of mobility',
    'one primary skill for 7–10 minutes',
    'secondary skill for 4–6 minutes only when time permits',
    'Tuesday: handstand primary and V-sit secondary',
    'Wednesday: V-sit primary',
    'Friday: front lever primary and handstand secondary',
    'Wrist preparation',
    'Chest-to-wall handstand',
    'Wall toe-pulls or heel-pulls',
    'Freestanding kick-ups',
    'Seated pike compression lifts',
    'Tuck L-sit or one-leg-extended L-sit',
    'three freestanding holds exceed five seconds',
    'Build a 3 × 10-second full L-sit'
  ],
  'front-lever': [
    'Monday provides formal lever practice',
    'Friday is the primary skill morning',
    'Saturday C can add an optional exposure',
    'stable rated bar',
    'Scapular pull-ups',
    'Tuck front-lever hold',
    '3 × 12 seconds is clean for two sessions',
    'Banded straight-arm pulldown from a rated anchor',
    'No-anchor rows and hollow work maintain prerequisites but are not equivalent front-lever exposure'
  ],
  'pistol-squat': [
    'Thursday during Full-body B',
    'weekend non-badminton morning',
    'Ankle and squat preparation — 1 minute',
    '2–3 × 3–5 per side',
    'Controlled full pistol, counterweighted pistol, or assisted pistol',
    'three-second eccentric',
    'stable foot, controlled knee path, and level pelvis',
    'verified stable support',
    '2 × 5 clean repetitions per side for two sessions'
  ],
  'grease-the-groove': [
    '2–4 days/week',
    'one primary movement per day',
    '2–4 mini-sets spread across the day',
    'five repetitions in reserve',
    'roughly 24 hours before or after hard training of the same pattern',
    'Do not use jumps, loaded pull-ups, ab-wheel repetitions, or fatiguing lower-body sets',
    'Remove GTG first when badminton performance, wrists, elbows, shoulders, legs, or back deteriorate'
  ]
};
const cardPhrases = {
  'morning-mobility': ['90/90 breathing', 'Cat-camel', 'Hip-flexor stretch', 'Open book', 'Ankle rocks', 'Supported squat', 'Glute bridge', 'Wall slides', 'Back-sensitive morning'],
  'full-body-a': ['No plyometrics', 'Front lever', '3 rounds', 'Backpack push-up', 'Pull-up', 'strong band row', '2 rounds', 'Single-leg RDL', 'Side plank', 'Bent-knee calf'],
  'full-body-b': ['Pistol practice', 'One jump drill', 'Omit after Wed badminton', 'Pike push-up', 'Goblet squat', 'Pallof', 'RATED ANCHOR', 'Copenhagen', 'replaces—not follows—the finisher', 'move B to Friday and omit C'],
  'full-body-c': ['Saturday only when there is no weekend badminton', 'No mandatory jumps', 'Dip/push-up', 'Pull-up/row', 'Step-up/lunge', 'verified stable surface', 'Bird dog', 'Shoulder tap', 'replaces the trunk finisher', 'Omit C after a two-badminton week or if recovery is suboptimal'],
  'handstand-v-sit': ['16–25 min', 'Mobility · 6–8 min', 'Primary · 7–10 min', 'Secondary · 4–6 min', 'Wall hold', 'Toe/heel pulls', 'Pike lifts', 'Tuck L-sit', 'Advance after 2 clean sessions', 'Regress when form fades'],
  'front-lever': ['stable rated bar', 'Scap pull-ups', 'Tuck hold', '3 × 12 sec clean', 'for 2 sessions', 'Band pulldown', 'RATED ANCHOR', 'not equivalent front-lever exposure'],
  'pistol-squat': ['Prep · 1 min', '2–3 × 3–5/side', 'Assisted', 'counterweighted', 'controlled full pistol', '3-sec eccentric', '2 × 5 clean/side', 'for 2 sessions', 'backpack loading'],
  'grease-the-groove': ['2–4 days/week', '2–4 mini-sets/day', 'One primary movement per day', 'Pull-up', 'Push-up', 'Supported pistol', 'Jumps', 'loaded pull-ups', 'Ab wheel', 'fatiguing legs', 'roughly 24 hours']
};
const fullSafety = 'Stop and arrange clinical assessment for new, changing, recurrent, or radiating symptoms before progressing loaded hinges, unilateral leg work, or plyometrics. Exercises should not cause symptoms that remain meaningfully worse the following day. Skill work, jumps, and loaded strength all stop before technique deteriorates. Seek emergency assessment for saddle numbness or bowel/bladder change. Seek urgent clinical assessment for new or progressive leg weakness.';
const shortSafety = 'Stop if symptoms worsen, radiate, or technique deteriorates. Follow physio guidance and read the full safety notes.';
const normalize = (value) => String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const digest = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');

const sourceData = JSON.parse(await readFile(join(repo, 'source', 'workouts.json'), 'utf8'));
assert(sourceData.meta.safetyFull === fullSafety, 'source/workouts.json safetyFull must exactly match the approved full safety block');
assert(sourceData.meta.safetyShort === shortSafety, 'source/workouts.json safetyShort must exactly match the approved concise safety line');
assert(sourceData.workouts.length === 8, `Expected 8 source workouts, found ${sourceData.workouts.length}`);
assert(JSON.stringify(sourceData.workouts.map(({ slug }) => slug)) === JSON.stringify(slugs), 'Source workout order/slugs changed');

for (const workout of sourceData.workouts) {
  assert(typeof workout.progression === 'string' && workout.progression.trim(), `${workout.slug}: progression must be explicit`);
  assert(typeof workout.cardSafety === 'string' && workout.cardSafety.trim(), `${workout.slug}: cardSafety must be explicit`);
  assert(workout.cardSafety.includes(shortSafety), `${workout.slug}: cardSafety must include the exact concise safety line`);
  const cardText = normalize(JSON.stringify({
    duration: workout.duration,
    warning: workout.warning,
    timing: workout.timing,
    cardSections: workout.cardSections,
    progression: workout.progression,
    cardSafety: workout.cardSafety
  }));
  for (const phrase of cardPhrases[workout.slug]) {
    assert(cardText.includes(normalize(phrase)), `${workout.slug}: source card is missing required text: ${phrase}`);
  }
  if (cardText.includes('band pulldown') || cardText.includes('pallof')) {
    assert(cardText.includes('rated anchor'), `${workout.slug}: card mentions a band pulldown or Pallof press without rated-anchor wording`);
  }
}
console.log('PASS source contract: 8/8 cards include required content, progression, explicit cardSafety, and exact safety wording');

const artworkReview = normalize(await readFile(join(repo, 'source', 'artwork-review.md'), 'utf8'));
for (const phrase of [
  'Pistol Squat corrected illustration is explicitly unloaded',
  'Pistol Squat illustration shows no added load',
  'Grease the Groove corrected illustration is explicitly unloaded',
  'Grease the Groove illustration shows no added load'
]) {
  assert(artworkReview.includes(normalize(phrase)), `source/artwork-review.md must state: ${phrase}`);
}
console.log('PASS artwork review records no added load in both corrected illustrations');

const cardFiles = (await readdir(join(docs, 'cards'))).filter((name) => name.endsWith('.png')).sort();
const pageFiles = (await readdir(join(docs, 'workouts'))).filter((name) => name.endsWith('.html')).sort();
assert(cardFiles.length === 8, `Expected 8 cards, found ${cardFiles.length}`);
assert(pageFiles.length === 8, `Expected 8 workout pages, found ${pageFiles.length}`);
assert(JSON.stringify(cardFiles) === JSON.stringify(slugs.map((slug) => `${slug}-v1.png`).sort()), 'Versioned card filenames do not match the stable slugs');
assert(JSON.stringify(pageFiles) === JSON.stringify(slugs.map((slug) => `${slug}.html`).sort()), 'Workout page filenames do not match the stable slugs');
assert((await stat(join(docs, '.nojekyll'))).isFile(), 'docs/.nojekyll is missing');
assert((await stat(join(docs, '.nojekyll'))).size === 0, 'docs/.nojekyll must be an empty file');
for (const requiredPath of ['index.html', 'plan.html', 'plan.md', 'styles.css', 'cards', 'workouts']) {
  await access(join(docs, requiredPath)).catch(() => { throw new Error(`GitHub Pages docs structure is missing docs/${requiredPath}`); });
}
const readme = normalize(await readFile(join(repo, 'README.md'), 'utf8'));
assert(readme.includes('main branch') && readme.includes('docs'), 'README must document GitHub Pages deployment from main/docs');
assert(await digest(join(repo, 'source', 'plan.md')) === await digest(join(docs, 'plan.md')), 'docs/plan.md must be an unchanged copy of source/plan.md');
console.log('PASS Pages structure: main/docs assumptions, .nojekyll, and unchanged plan copy');

for (const filename of cardFiles) {
  const path = join(docs, 'cards', filename);
  assert((await stat(path)).size > 20_000, `${filename} is unexpectedly small`);
  const metadata = await sharp(path).metadata();
  assert(metadata.format === 'png' && metadata.width === 1600 && metadata.height === 2000, `${filename}: expected 1600x2000 PNG, got ${metadata.format} ${metadata.width}x${metadata.height}`);
}
const contactSheet = await sharp(join(docs, 'workout-card-index-preview.png')).metadata();
assert(contactSheet.format === 'png' && contactSheet.width === 872 && contactSheet.height === 2120, `workout-card-index-preview.png: expected 872x2120 PNG, got ${contactSheet.format} ${contactSheet.width}x${contactSheet.height}`);
console.log('PASS rendered artifacts: 8/8 1600x2000 PNG cards and 872x2120 contact sheet');

const cardCss = await readFile(join(repo, 'source', 'card.css'), 'utf8');
let primaryRuleCount = 0;
for (const match of cardCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selector = match[1];
  const declarations = match[2];
  if (!selector.includes('.primary')) continue;
  primaryRuleCount += 1;
  assert(!/(^|;)\s*font\s*:/.test(declarations), `Primary text cannot use font shorthand that may bypass the 72px minimum: ${selector.trim()}`);
  for (const size of declarations.matchAll(/font-size\s*:\s*([\d.]+)px/g)) {
    assert(Number(size[1]) >= 72, `Primary text is below 72px in selector ${selector.trim()}: ${size[1]}px`);
  }
}
assert(primaryRuleCount > 0, 'source/card.css must define a .primary rule');
const basePrimary = cardCss.match(/(?:^|\})\s*\.primary\s*\{([^}]*)\}/m);
assert(basePrimary, 'source/card.css must define the base .primary rule directly');
const basePrimarySize = Number(basePrimary[1].match(/font-size\s*:\s*([\d.]+)px/)?.[1]);
assert(basePrimarySize >= 72, `Base .primary font-size must be at least 72px, found ${basePrimarySize || 'none'}`);
console.log(`PASS card typography: primary exercise/instruction text is ${basePrimarySize}px with no downscale overrides`);

const htmlEntries = [
  { path: join(docs, 'index.html'), relativePath: 'index.html', productionUrl: productionBase },
  { path: join(docs, 'plan.html'), relativePath: 'plan.html', productionUrl: new URL('plan.html', productionBase).href },
  ...slugs.map((slug) => ({
    path: join(docs, 'workouts', `${slug}.html`),
    relativePath: `workouts/${slug}.html`,
    productionUrl: `${productionBase}workouts/${slug}.html`,
    slug
  }))
];

for (const entry of htmlEntries) {
  const html = await readFile(entry.path, 'utf8');
  assert(/<html\s+lang="en"/.test(html), `${entry.relativePath}: missing lang=en`);
  assert(/name="viewport"\s+content="width=device-width, initial-scale=1"/.test(html), `${entry.relativePath}: missing exact viewport metadata`);
  assert(html.includes(`<link rel="canonical" href="${entry.productionUrl}">`), `${entry.relativePath}: canonical URL must map to ${entry.productionUrl}`);
  assert(/<a class="skip-link" href="#main-content">/.test(html), `${entry.relativePath}: missing skip-to-content link`);
  assert(/<main\s+id="main-content"/.test(html) && /<h1[\s>]/.test(html) && /<nav[\s>]/.test(html), `${entry.relativePath}: missing main, h1, or nav semantics`);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|#)/.test(reference)) continue;
    assert(!reference.startsWith('/') && !reference.startsWith('\\'), `${entry.relativePath}: project-local reference must be relative under ${projectPrefix}: ${reference}`);
    const resourcePath = reference.split(/[?#]/)[0];
    const target = resolve(dirname(entry.path), resourcePath);
    assert(target === docs || target.startsWith(`${docs}/`), `${entry.relativePath}: reference escapes docs: ${reference}`);
    await access(target).catch(() => { throw new Error(`${entry.relativePath}: broken local reference ${reference}`); });
    const productionTarget = new URL(reference, entry.productionUrl);
    assert(productionTarget.origin === new URL(productionBase).origin && productionTarget.pathname.startsWith(projectPrefix), `${entry.relativePath}: reference escapes the production project prefix: ${reference}`);
  }
}
console.log(`PASS metadata and links: all HTML maps beneath ${productionBase}`);

for (const workout of sourceData.workouts) {
  const path = join(docs, 'workouts', `${workout.slug}.html`);
  const rawHtml = await readFile(path, 'utf8');
  const html = normalize(rawHtml);
  for (const phrase of pagePhrases[workout.slug]) {
    assert(html.includes(normalize(phrase)), `${workout.slug}: page is missing required text: ${phrase}`);
  }
  assert(rawHtml.includes(`<p>${escapeHtml(fullSafety)}</p>`), `${workout.slug}: page must include the exact approved full safety block in one paragraph`);
  assert(/<figure class="card-figure">[\s\S]*<figcaption>/.test(rawHtml), `${workout.slug}: card image requires semantic figure/figcaption markup`);
  assert(/<article[^>]+aria-labelledby="instructions-title"/.test(rawHtml), `${workout.slug}: instructions require a labelled article`);
  assert(/<section class="progression-rule"[^>]+aria-labelledby="progression-title"/.test(rawHtml), `${workout.slug}: progression must be a visible labelled semantic section`);
  assert(/<h2 id="progression-title">Progression<\/h2>/.test(rawHtml), `${workout.slug}: progression heading is missing`);
  assert(rawHtml.includes(`<p>${escapeHtml(workout.progression)}</p>`), `${workout.slug}: exact progression field is not visibly rendered`);
  assert(/<section class="card-safety-rule"[^>]+aria-labelledby="card-safety-title"/.test(rawHtml), `${workout.slug}: cardSafety must be a visible labelled semantic section`);
  assert(/<h2 id="card-safety-title">Card safety rule<\/h2>/.test(rawHtml), `${workout.slug}: cardSafety heading is missing`);
  assert(rawHtml.includes(`<p>${escapeHtml(workout.cardSafety)}</p>`), `${workout.slug}: exact cardSafety field is not visibly rendered`);
  const imageAlt = rawHtml.match(/<img[^>]+alt="([^"]+)"/)?.[1] ?? '';
  assert(imageAlt.length >= 80 && /illustration|athlete|movement/i.test(imageAlt), `${workout.slug}: card image alt text is not sufficiently descriptive`);
}
console.log('PASS accessible workout content: complete instructions, exact progression/cardSafety, semantic figures, and descriptive alt text');

const channel = (hex) => {
  const value = parseInt(hex, 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => 0.2126 * channel(hex.slice(1, 3)) + 0.7152 * channel(hex.slice(3, 5)) + 0.0722 * channel(hex.slice(5, 7));
const contrast = (a, b) => {
  const [bright, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (bright + 0.05) / (dark + 0.05);
};
for (const [foreground, background] of [['#12272c', '#f5f0e5'], ['#f5f0e5', '#10272d'], ['#12272c', '#e4a33b'], ['#315f4a', '#fffdf7']]) {
  assert(contrast(foreground, background) >= 4.5, `Contrast failed: ${foreground} on ${background}`);
}
const siteCss = await readFile(join(docs, 'styles.css'), 'utf8');
assert(siteCss.includes(':focus-visible') && siteCss.includes('overflow-wrap'), 'CSS lacks visible focus or wrapping safeguards');
assert(/@media\s*\(max-width:\s*700px\)/.test(siteCss), 'CSS lacks a single-column mobile breakpoint');
console.log('PASS WCAG AA palette, focus, wrapping, and mobile CSS indicators');

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (pathname === '/favicon.ico' || pathname === `${projectPrefix}favicon.ico`) return response.writeHead(204).end();
    assert(pathname.startsWith(projectPrefix), 'Request escaped project prefix');
    const requested = pathname.slice(projectPrefix.length);
    const resource = requested === '' ? 'index.html' : requested;
    assert(!resource.includes('..'), 'Invalid path');
    const body = await readFile(join(docs, resource));
    response.writeHead(200, { 'content-type': mime[extname(resource)] ?? 'application/octet-stream' });
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
  for (const width of [320, 360]) {
    for (const entry of htmlEntries) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('pageerror', (error) => errors.push(error.message));
      const response = await page.goto(`http://127.0.0.1:${port}${projectPrefix}${entry.relativePath === 'index.html' ? '' : entry.relativePath}`, { waitUntil: 'networkidle' });
      assert(response.ok(), `${entry.relativePath} returned ${response.status()} at ${width}px`);
      for (const image of await page.locator('img').all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(async (element) => {
          if (!element.complete || element.naturalWidth === 0) await element.decode();
        });
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      const result = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        bodySize: parseFloat(getComputedStyle(document.body).fontSize),
        headings: document.querySelectorAll('h1').length,
        main: document.querySelectorAll('main#main-content').length,
        navs: document.querySelectorAll('nav').length,
        imageReady: [...document.images].every((image) => image.complete && image.naturalWidth > 0),
        imageAlts: [...document.images].every((image) => image.alt.trim().length >= 40),
        semanticTextVisible: [...document.querySelectorAll('.progression-rule, .card-safety-rule')].every((section) => {
          const style = getComputedStyle(section);
          return style.display !== 'none' && style.visibility !== 'hidden' && section.getBoundingClientRect().height > 0;
        })
      }));
      assert(!result.overflow, `${entry.relativePath} overflows horizontally at ${width}px`);
      assert(result.bodySize >= 16, `${entry.relativePath} body text is below 16px at ${width}px`);
      assert(result.headings === 1 && result.main === 1 && result.navs >= 1, `${entry.relativePath} lacks one h1, one main, or navigation at ${width}px`);
      assert(result.imageReady && result.imageAlts && errors.length === 0, `${entry.relativePath} has image, alt, or runtime errors at ${width}px: ${errors.join(' | ')}`);
      assert(result.semanticTextVisible, `${entry.relativePath} hides progression or cardSafety text at ${width}px`);
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const style = getComputedStyle(document.activeElement);
        return { tag: document.activeElement.tagName, width: parseFloat(style.outlineWidth), style: style.outlineStyle };
      });
      assert(focus.tag === 'A' && focus.width >= 2 && focus.style !== 'none', `${entry.relativePath} lacks keyboard-visible first-link focus at ${width}px`);
      await page.close();
    }
    console.log(`PASS responsive, semantic, descriptive-alt, and focus checks for all pages at ${width}px`);
  }
} finally {
  if (browser) await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

console.log(`VALIDATION COMPLETE: 8/8 cards and 8/8 workout pages passed; production base ${productionBase}`);
