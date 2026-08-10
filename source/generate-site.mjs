import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const source = join(repo, 'source');
const docs = join(repo, 'docs');
const productionBase = 'https://jvieirar.github.io/functional-fitness-workout-cards/';
const data = JSON.parse(await readFile(join(source, 'workouts.json'), 'utf8'));
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const nav = (prefix = '') => `<nav class="site-nav" aria-label="Primary"><ul><li><a href="${prefix}index.html">Workout library</a></li><li><a href="${prefix}plan.html">Full plan</a></li></ul></nav>`;
const header = (prefix = '') => `<header class="site-header"><div class="site-header__inner"><a class="brand" href="${prefix}index.html">FUNCTIONAL FITNESS CARDS</a>${nav(prefix)}</div></header>`;
const footer = '<footer class="site-footer"><p>General exercise programming—not diagnosis or rehabilitation. Existing physiotherapy advice takes precedence.</p></footer>';
const document = ({ title, prefix = '', canonicalUrl, body }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escape(title)} · Functional Fitness Cards</title>
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="stylesheet" href="${prefix}styles.css">
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  ${header(prefix)}
  ${body}
  ${footer}
</body>
</html>`;

await mkdir(join(docs, 'cards'), { recursive: true });
await mkdir(join(docs, 'workouts'), { recursive: true });
await copyFile(join(source, 'site.css'), join(docs, 'styles.css'));
await copyFile(join(source, 'plan.md'), join(docs, 'plan.md'));
await writeFile(join(docs, '.nojekyll'), '');

for (const workout of data.workouts) {
  const sections = workout.detailSections.map((section) => `<section><h3>${escape(section.title)}</h3><ul>${section.items.map((item) => `<li>${escape(item)}</li>`).join('')}</ul></section>`).join('\n');
  const body = `<main id="main-content" class="shell">
    <header class="page-intro">
      <p class="eyebrow">${escape(workout.day)}</p>
      <h1>${escape(workout.pageTitle)}</h1>
      <p class="lede">${escape(workout.intro)}</p>
      <div class="meta-row" aria-label="Session summary"><span class="meta-chip">${escape(workout.duration)}</span><span class="meta-chip meta-chip--warning">${escape(workout.warning)}</span></div>
    </header>
    <figure class="card-figure">
      <img src="../cards/${workout.slug}-v1.png?v=2" width="1600" height="2400" alt="Workout card for ${escape(workout.pageTitle)}. ${escape(workout.alt)}. Complete equivalent instructions follow below.">
      <figcaption>The illustration is a visual reminder, not authoritative form instruction. Use the complete text below.</figcaption>
    </figure>
    <article id="instructions" class="workout-copy" aria-labelledby="instructions-title">
      <h2 id="instructions-title">Complete instructions</h2>
      <p>${escape(workout.intro)}</p>
      ${sections}
      <section class="progression-rule" aria-labelledby="progression-title"><h2 id="progression-title">Progression</h2><p>${escape(workout.progression)}</p></section>
      <section class="card-safety-rule" aria-labelledby="card-safety-title"><h2 id="card-safety-title">Card safety rule</h2><p>${escape(workout.cardSafety)}</p></section>
      <aside class="notice" aria-labelledby="safety-title"><h2 id="safety-title">Safety notes</h2><p>${escape(data.meta.safetyFull)}</p></aside>
      <section><h3>Readiness rules</h3><ul><li><strong>Green:</strong> normal muscle effort or mild stiffness that improves during warm-up—continue.</li><li><strong>Yellow:</strong> localized discomfort, reduced range, or symptoms worsening set to set—reduce range or load, choose a simpler variation, or perform mobility only.</li><li>Indoor exercises are not automatically safer. Never use an improvised door, furniture edge, or unstable anchor for high-tension pulling.</li></ul></section>
      <nav class="subnav" aria-label="Related resources"><a href="../index.html">All workout cards</a><a href="../plan.html">Read the full workout plan</a><a href="../plan.md">Download the Markdown plan</a></nav>
    </article>
  </main>`;
  await writeFile(join(docs, 'workouts', `${workout.slug}.html`), document({ title: workout.pageTitle, prefix: '../', canonicalUrl: `${productionBase}workouts/${workout.slug}.html`, body }));
}

const cards = data.workouts.map((workout) => `<li><a href="workouts/${workout.slug}.html"><img src="cards/${workout.slug}-v1.png?v=2" width="1600" height="2400" alt="Preview illustration: ${escape(workout.alt)}" loading="lazy"><span class="card-grid__copy"><strong>${escape(workout.pageTitle)}</strong><small>${escape(workout.duration)} · ${escape(workout.day)}</small></span></a></li>`).join('\n');
const indexBody = `<main id="main-content" class="shell">
  <header class="page-intro"><p class="eyebrow">Eight stable, reusable sessions</p><h1>Workout card library</h1><p class="lede">A phone-friendly companion to the functional full-body training plan. Open a card for complete instructions, alternatives, progression gates, and safety notes.</p></header>
  <ul class="card-grid" aria-label="Workout cards">${cards}</ul>
  <article class="workout-copy"><h2>How to use the library</h2><p>Each stable workout page links to a versioned card image and complete equivalent text. Bookmark the HTML page rather than the image so future card revisions keep the same URL.</p><p><a href="plan.html">Read the full workout plan</a> or <a href="plan.md">download the Markdown source</a>.</p><aside class="notice"><h3>Safety first</h3><p>${escape(data.meta.safetyFull)}</p></aside></article>
</main>`;
await writeFile(join(docs, 'index.html'), document({ title: 'Workout card library', canonicalUrl: productionBase, body: indexBody }));

const inline = (value) => escape(value).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
const renderMarkdown = (markdown) => {
  const lines = markdown.split(/\r?\n/);
  const output = [];
  let index = 0;
  let list = null;
  const closeList = () => { if (list) { output.push(`</${list}>`); list = null; } };
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { closeList(); index += 1; continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { closeList(); const level = Math.min(6, heading[1].length + 1); output.push(`<h${level}>${inline(heading[2])}</h${level}>`); index += 1; continue; }
    if (line.startsWith('> ')) { closeList(); output.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`); index += 1; continue; }
    if (line.includes('|') && lines[index + 1]?.match(/^\s*\|?\s*:?-+/)) {
      closeList();
      const rows = [];
      const parseRow = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
      rows.push(parseRow(line)); index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) { rows.push(parseRow(lines[index])); index += 1; }
      output.push(`<div class="table-wrap"><table><thead><tr>${rows[0].map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const number = line.match(/^\d+\.\s+(.+)$/);
    if (bullet || number) {
      const type = bullet ? 'ul' : 'ol';
      if (list !== type) { closeList(); output.push(`<${type}>`); list = type; }
      output.push(`<li>${inline((bullet || number)[1])}</li>`); index += 1; continue;
    }
    closeList();
    const paragraph = [line.trim()]; index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,6})\s|^[-*]\s|^\d+\.\s|^>\s/.test(lines[index]) && !(lines[index].includes('|') && lines[index + 1]?.match(/^\s*\|?\s*:?-+/))) { paragraph.push(lines[index].trim()); index += 1; }
    output.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  closeList();
  return output.join('\n');
};
const planMarkdown = await readFile(join(source, 'plan.md'), 'utf8');
const planBody = `<main id="main-content" class="shell"><header class="page-intro"><p class="eyebrow">Source of truth</p><h1>Functional Full-Body Training Design</h1><p class="lede">The complete approved plan, rendered as accessible HTML. The unchanged Markdown source is also available.</p><p><a href="plan.md">Open the Markdown plan</a></p></header><article class="plan-copy">${renderMarkdown(planMarkdown)}</article></main>`;
await writeFile(join(docs, 'plan.html'), document({ title: 'Full workout plan', canonicalUrl: `${productionBase}plan.html`, body: planBody }));

console.log(`Generated ${data.workouts.length} workout pages, index, plan, and shared assets in ${docs}`);
