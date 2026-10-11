import assert from 'node:assert/strict';
import { createProcessor } from '@mdx-js/mdx';
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

test('link rewriting preserves labels, titles and encoded destinations', async () => {
  const cases = [
    ['[/install](/install "/install")', '[/install](https://ultima.systems/guides/install.md "/install")'],
    ['[**/install** and `code`](/install#part%20one "/install")', '[**/install** and `code`](https://ultima.systems/guides/install.md#part%20one "/install")'],
    [String.raw`[escaped](/install#part\) "/install")`, String.raw`[escaped](https://ultima.systems/guides/install.md#part\) "/install")`],
    ['[angle](</install#part%20one> "/install")', '[angle](<https://ultima.systems/guides/install.md#part%20one> "/install")'],
    ['[encoded](/inst&#97;ll "/install")', '[encoded](https://ultima.systems/guides/install.md "/install")'],
    ['[entity](/install#&amp;copy;)', '[entity](https://ultima.systems/guides/install.md#&amp;copy;)'],
    ['[Space](/install#part&#32;one)', '[Space](https://ultima.systems/guides/install.md#part&#32;one)'],
    ['[Tab](/install#part&#9;one)', '[Tab](https://ultima.systems/guides/install.md#part&#9;one)'],
    ['[Newline](/install#part&#10;one)', '[Newline](https://ultima.systems/guides/install.md#part&#10;one)'],
    ['[](/install)', '[](https://ultima.systems/guides/install.md)'],
    ['[<Code>/install</Code>](/install)', '[`/install`](https://ultima.systems/guides/install.md)'],
    ['[/install]: /install "/install"', '[/install]: https://ultima.systems/guides/install.md "/install"'],
  ];
  const source = cases.map(([input]) => input).join('\n\n') + '\n';
  const guides = await markdownGuidance({ ...files, read: (path) => path.endsWith('install.mdx') ? source : files.read(path) }, catalogue, composition);
  assert.equal(guides.get('install.md'), cases.map(([, expected]) => expected).join('\n\n') + '\n');
  const parsed = createProcessor().parse(guides.get('install.md')!);
  for (const whitespace of [' ', '\t', '\n']) assert.ok(parsed.children.some((node) => node.type === 'paragraph' && node.children.some((child) => child.type === 'link' && child.url === `https://ultima.systems/guides/install.md#part${whitespace}one`)));
});

test('published guidance detects edited, missing and obsolete artifacts', async () => {
  const { mkdtempSync, rmSync, writeFileSync, unlinkSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join, sep } = await import('node:path');
  const { checkGuidance, publishGuidance } = await import('../markdown-guidance.ts');
  const directory = mkdtempSync(join(tmpdir(), 'ultima-guidance-'));
  try {
    const guides = await markdownGuidance(files, catalogue, composition);
    publishGuidance(directory, guides);
    assert.deepEqual(checkGuidance(directory, guides), []);
    assert.deepEqual(checkGuidance(directory + sep, guides), []);
    writeFileSync(join(directory, 'install.md'), 'outdated');
    unlinkSync(join(directory, 'support.md'));
    unlinkSync(join(directory, 'lessons/projects.md'));
    writeFileSync(join(directory, 'lessons/old.md'), 'obsolete');
    const stale = ['install.md', 'lessons/old.md', 'lessons/projects.md', 'support.md'];
    assert.deepEqual(checkGuidance(directory, guides).sort(), stale);
    assert.deepEqual(checkGuidance(directory + sep, guides).sort(), stale);
    publishGuidance(directory, guides);
    assert.deepEqual(checkGuidance(directory, guides), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
