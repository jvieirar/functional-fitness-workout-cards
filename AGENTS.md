# Functional Fitness Workout Cards

Static workout-card library published with GitHub Pages from `docs/` on `main`
(`https://jvieirar.github.io/functional-fitness-workout-cards/`). Plain Node ESM scripts
(`source/*.mjs`) generate the HTML pages, render 1600x2400 PNG cards with Playwright,
build a contact sheet with sharp, and validate the result. No framework, no TypeScript,
no linter; styling is hand-written CSS (`source/site.css`, `source/card.css`).

## Commands (npm)

- `npm ci` then `npx playwright install chromium`: install. Render and validate need Chromium.
- `npm run check`: `node --check` on every `source/*.mjs` and `test/*.mjs`, then `npm test`.
- `npm test`: `node --test`, runs `test/reproducibility.test.mjs` once.
- `npm run validate`: read-only check of the committed `docs/` (content, links, image sizes,
  contrast, and a headless-Chromium pass at 320px and 360px). Needs Chromium; not in `check`.
- `npm run generate` / `npm run render` / `npm run build` (generate + render + contact
  sheet + validate): these overwrite committed files in `docs/`, so run them only when asked.
- No dev server. To browse: `python3 -m http.server 8000 --directory docs`, then open
  `http://localhost:8000/`.

## Verification

- `npm run check` must pass.
- For page, CSS or content changes: `npm run validate`, then open `http://localhost:8000/`
  (library), `/workouts/<slug>.html` (e.g. `full-body-a`) and `/plan.html`. Pages are
  light-only (`color-scheme: light`); the mobile breakpoint is `max-width: 700px`.
- No env vars, secrets or services.

## Conventions

- `docs/` is generated output that is committed. Edit `source/` (`workouts.json`,
  `plan.md`, `site.css`, templates) and regenerate; `docs/styles.css` and `docs/plan.md`
  are copies of `source/site.css` and `source/plan.md`.
- The eight workout slugs and their order are hard-coded in `source/workouts.json`,
  `source/validate-site.mjs` (with required phrases per slug) and
  `source/create-contact-sheet.mjs`. Adding or renaming a workout means updating all three.
- The safety wording in `workouts.json` (`meta.safetyShort`, `meta.safetyFull`) must match
  the exact strings in `validate-site.mjs`. Card primary text must stay at least 72px.
- Cards are `docs/cards/<slug>-v1.png`; pages reference them as `-v1.png?v=2` for cache
  busting. All HTML links must be relative, because the site is served under
  `/functional-fitness-workout-cards/`.
- `test/reproducibility.test.mjs` asserts on file text with regexes: the README must keep
  `npm install`, `npx playwright install chromium` and `npm run build`; `source/*.mjs` must
  not contain `outputs` or machine-specific paths; `card.css` grid rows and the 2400px
  height are pinned. Update the test when you change those deliberately.
- Content is general exercise programming, not medical advice; keep the safety notes.
