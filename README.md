# Functional Fitness Workout Cards

A static, accessible workout-card library for the approved Functional Full-Body Training Design. GitHub Pages is designed to serve the site from `docs/`; each workout has a stable HTML URL and a versioned 1600×2000 PNG card.

## Repository layout

- `source/workouts.json` — approved card summaries and complete page instructions
- `source/artwork/` — reviewed, text-free illustration sheets
- `source/card-template.html` and `source/card.css` — deterministic card composition
- `source/generate-site.mjs` — static page and plan generation
- `source/render-cards.mjs` — Playwright PNG rendering
- `source/validate-site.mjs` — content, link, image, responsive, and accessibility checks
- `docs/` — publishable GitHub Pages output

## Rebuild and validate

Use Node.js 20.9 or newer. From a fresh clone, install the locked npm dependencies and Playwright's bundled Chromium, then run the complete build:

```sh
npm install
npx playwright install chromium
npm run build
```

`npm run build` regenerates the site, renders all cards and the contact sheet, and validates the result. Every generated artifact stays under `docs/`; the build and validator do not read from or write to directories outside this repository.

For repeatable CI installs after `package-lock.json` exists, use `npm ci` instead of `npm install`. On Linux hosts that do not already provide Chromium's system libraries, install them with `npx playwright install --with-deps chromium`.

Run individual stages when needed:

```sh
npm run generate
npm run render
npm run validate
```

Run the repository portability regression tests with `npm test`.

## GitHub Pages

After a separately authorized repository setup, configure GitHub Pages to deploy from the `docs/` directory on the main branch. This project does not initialize Git, publish a repository, or perform calendar operations.

## Safety scope

This is general exercise programming, not diagnosis or rehabilitation. Existing physiotherapy advice takes precedence. The illustrations are visual reminders rather than authoritative form instruction; every workout page provides complete equivalent text and the approved safety notes.
