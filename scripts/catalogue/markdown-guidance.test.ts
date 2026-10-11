import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { markdownGuidance } from '../markdown-guidance.ts';
import { diskFiles } from './files.ts';
import { loadCatalogue } from './model.ts';
import { compositionProjection } from './compositions.ts';

const files = diskFiles(fileURLToPath(new URL('../..', import.meta.url)));
const { catalogue } = loadCatalogue(files);
const composition = compositionProjection(files, catalogue);

test('an HTTP reader gets install steps and every file of the Projects screen', async () => {
  const guides = await markdownGuidance(files, catalogue, composition);
  const install = guides.get('install.md')!;
  assert.match(install, /npx shadcn add https:\/\/ultima.systems\/r\/setup-vite.json/);
  assert.match(install, /npx shadcn add https:\/\/ultima.systems\/r\/setup-next.json/);
  assert.match(install, /ultimaStylex\(\)/);
  assert.match(install, /ultima.eslint.mjs/);
  assert.match(install, /data-theme="dark"/);
  const projects = guides.get('lessons/projects.md')!;
  for (const path of ['components/projects/projects.tsx', 'components/projects/projects-data.ts', 'components/projects/screen.stylex.ts']) assert.ok(projects.includes(path), path);
  assert.match(projects, /from '@\/components\/ui\/button'/);
  assert.doesNotMatch(projects, /from '@ultima\//);
  assert.ok(!install.includes('<InstallCommands'));
});

test('support and lesson exports retain dynamic evidence and reject unhandled content', async () => {
  const manifest = JSON.parse(files.read('apps/docs/src/support-evidence.json')!);
  manifest.run.revision = 'candidate-evidence-revision';
  const guides = await markdownGuidance({ ...files, read: (path) => path.endsWith('support-evidence.json') ? JSON.stringify(manifest) : files.read(path) }, catalogue, composition);
  const support = guides.get('support.md')!;
  assert.match(support, /candidate-evidence-revision/);
  assert.match(support, /Physical phones/);
  assert.match(support, /390/);
  assert.match(guides.get('lessons/settings-01-adaptation.md')!, /import \{ Settings01 \}/);
  await assert.rejects(markdownGuidance({ ...files, read: (path) => path.endsWith('install.mdx') ? `${files.read(path)}\n<NewRequiredStep />\n` : files.read(path) }, catalogue, composition), /unhandled guidance component: NewRequiredStep/);
  await assert.rejects(markdownGuidance(files, catalogue, { ...composition, sources: {} }), /missing copy bundle/);
});

test('published guidance detects edited, missing and obsolete artifacts', async () => {
  const { mkdtempSync, rmSync, writeFileSync, unlinkSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { checkGuidance, publishGuidance } = await import('../markdown-guidance.ts');
  const directory = mkdtempSync(join(tmpdir(), 'ultima-guidance-'));
  try {
    const guides = await markdownGuidance(files, catalogue, composition);
    publishGuidance(directory, guides);
    assert.deepEqual(checkGuidance(directory, guides), []);
    writeFileSync(join(directory, 'install.md'), 'outdated');
    unlinkSync(join(directory, 'support.md'));
    writeFileSync(join(directory, 'old.md'), 'obsolete');
    assert.deepEqual(checkGuidance(directory, guides).sort(), ['install.md', 'old.md', 'support.md']);
    publishGuidance(directory, guides);
    assert.deepEqual(checkGuidance(directory, guides), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
