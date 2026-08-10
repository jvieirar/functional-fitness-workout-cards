import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repo = fileURLToPath(new URL('..', import.meta.url));
const readRepoFile = (path) => readFile(join(repo, path), 'utf8');

test('package metadata exposes the reproducible workflow', async () => {
  const packageJson = JSON.parse(await readRepoFile('package.json'));

  assert.equal(packageJson.type, 'module');
  assert.deepEqual(
    Object.keys(packageJson.scripts).filter((name) => ['build', 'generate', 'render', 'validate'].includes(name)).sort(),
    ['build', 'generate', 'render', 'validate']
  );
  assert.ok(packageJson.dependencies.playwright, 'playwright must be a local dependency');
  assert.ok(packageJson.dependencies.sharp, 'sharp must be a local dependency');
});

test('active build scripts are machine-independent and repository-local', async () => {
  const sourceFiles = (await readdir(join(repo, 'source'))).filter((name) => name.endsWith('.mjs'));
  const sources = await Promise.all(sourceFiles.map(async (name) => [name, await readRepoFile(`source/${name}`)]));

  for (const [name, source] of sources) {
    assert.doesNotMatch(source, /file:\/\/\/|\/Users\/|\/Applications\//, `${name} contains a machine-specific path or import`);
    assert.doesNotMatch(source, /(?:\.\.\/){2,}outputs|\boutputs\b/, `${name} depends on an external outputs directory`);
  }

  assert.match(await readRepoFile('source/render-cards.mjs'), /from 'playwright'/);
  assert.match(await readRepoFile('source/validate-site.mjs'), /from 'playwright'/);
  assert.match(await readRepoFile('source/create-contact-sheet.mjs'), /from 'sharp'/);
  assert.match(await readRepoFile('source/validate-site.mjs'), /from 'sharp'/);
});

test('fresh-clone setup and generated-file ignores are documented', async () => {
  const [readme, gitignore] = await Promise.all([
    readRepoFile('README.md'),
    readRepoFile('.gitignore')
  ]);

  for (const command of ['npm install', 'npx playwright install chromium', 'npm run build']) {
    assert.ok(readme.includes(command), `README is missing ${command}`);
  }
  assert.match(gitignore, /(?:^|\n)node_modules\/(?:\n|$)/);
});
