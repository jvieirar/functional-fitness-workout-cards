# Workout Card Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reproducible, publishable GitHub Pages site with eight approved workout cards and complete accessible instructions.

**Architecture:** A single JSON content model feeds a deterministic HTML card template and eight generated static workout pages. Playwright renders each fixed-size card to a versioned PNG; a standalone validation script checks file counts, image dimensions, content, links, semantics, contrast indicators, and mobile overflow.

**Tech Stack:** Static HTML/CSS, Node.js ES modules, Playwright, Sharp, GitHub Pages from `docs/`.

---

### Task 1: Define the acceptance test

**Files:**
- Create: `source/validate-site.mjs`

- [ ] Write the complete site validator before implementation.
- [ ] Run `node source/validate-site.mjs` and confirm it fails because deliverables are absent.

### Task 2: Model approved workout content

**Files:**
- Create: `source/workouts.json`
- Create: `source/artwork-review.md`
- Copy: `source/artwork/*.png`

- [ ] Transcribe all eight card summaries from the approved source and contract.
- [ ] Include complete accessible instructions and verbatim HTML safety language.
- [ ] Record movement/artwork inspection outcomes and any limitations.

### Task 3: Build deterministic generation and rendering

**Files:**
- Create: `source/card-template.html`
- Create: `source/card.css`
- Create: `source/generate-site.mjs`
- Create: `source/render-cards.mjs`

- [ ] Generate stable pages, index, plan HTML/Markdown, and shared styles.
- [ ] Render eight 1600×2000 `-v1.png` cards with the bundled Playwright runtime.
- [ ] Keep all authoritative text in HTML/CSS rather than artwork.

### Task 4: Complete repository documentation

**Files:**
- Create: `README.md`
- Create: `docs/.nojekyll`

- [ ] Document local generation, rendering, validation, and GitHub Pages setup.
- [ ] Confirm repository-relative links work under the project prefix.

### Task 5: Verify and hand off

- [ ] Run the full validator until all checks pass.
- [ ] Self-review content against both approved documents.
- [ ] Keep generated cards and the contact sheet inside the repository's `docs/` directory.
- [ ] Do not initialize Git, commit, push, publish, or access Calendar APIs.
