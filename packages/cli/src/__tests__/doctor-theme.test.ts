import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { serializeDraft } from '../../../tokens/src/theme/codec.ts';
import { presetDraft, resolveDraft, stockDraft, type ThemeDraft } from '../../../tokens/src/theme/draft.ts';
import { toCss, toDefaultDesignMd, toDesignMd, toStylex } from '../../../tokens/src/theme/export.ts';
import { withoutProvenance } from '../../../tokens/src/theme/provenance.ts';
import { doctorTheme, type ThemeReport } from '../doctor-theme.ts';
import { run } from '../run.ts';
import { edit, installCatalogue, smoke, snapshot, write } from './fixtures.ts';

function theme(target: 'vite' | 'next' = 'vite', draft = stockDraft()) {
  const root = smoke(target);
  const entry = target === 'vite' ? 'src/main.tsx' : 'app/layout.tsx';
  edit(root, entry, (text) => `import '../ultima-theme.css';\n${text}`);
  write(root, 'ultima-theme.json', serializeDraft(draft));
  write(root, 'ultima-theme.css', toCss(draft));
  write(root, 'DESIGN.md', toDesignMd(draft));
  return root;
}

async function report(root: string) {
  const before = snapshot(root);
  const result = await run(['doctor', '--theme', '--json', '--cwd', root]);
  expect(snapshot(root)).toEqual(before);
  const json = JSON.parse(result.stdout) as { theme: ThemeReport; diagnostics: { ruleId: string }[] };
  return { ...result, ...json };
}

describe('offline read-only theme freshness', () => {
  it.each(['vite', 'next'] as const)('matches complete linked exports in %s without fetching', async (target) => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() => { throw new Error('network denied'); });
    try {
      const result = await report(theme(target));
      expect(result.code).toBe(0);
      expect(result.theme.rows.filter((row) => row.artifact !== 'draft').map((row) => row.state)).toEqual(['match', 'match']);
      expect(result.theme.rows[0]).toMatchObject({ family: 'theme', paths: { artifact: 'ultima-theme.css', draft: 'ultima-theme.json' }, coverage: { modes: ['dark', 'light', 'reduced-motion'], contentMatches: true, rendering: 'not-evaluated' } });
      expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); }
  });

  it('detects hand-edited values with the original header and preserves both files', async () => {
    const root = theme();
    edit(root, 'ultima-theme.css', (text) => text.replace('--ult-radius-md: 4px', '--ult-radius-md: 31px'));
    const result = await report(root);
    expect(result.code).toBe(1);
    const css = result.theme.rows.find((row) => row.artifact === 'css')!;
    expect(css.state).toBe('mismatch');
    expect(css.differences).toContainEqual(expect.objectContaining({ actual: expect.stringContaining('31px'), expected: expect.stringContaining('4px') }));
    expect(result.diagnostics.some((item) => item.ruleId === 'ULT-THEME-001')).toBe(true);
  });

  it.each(['draft', 'export'] as const)('reports a change only to the %s', async (changed) => {
    const root = theme();
    const grove = presetDraft('grove');
    write(root, changed === 'draft' ? 'ultima-theme.json' : 'ultima-theme.css', changed === 'draft' ? serializeDraft(grove) : toCss(grove));
    const result = await report(root);
    expect(result.code).toBe(1);
    expect(result.theme.rows.find((row) => row.artifact === 'css')?.state).toBe('mismatch');
  });

  it('ignores prose outside the generated region and reconciles edits inside', async () => {
    const root = theme();
    edit(root, 'DESIGN.md', (text) => `Product typography rationale\n${text}\nKeep this footer byte-for-byte.\n`);
    expect((await report(root)).code).toBe(0);
    edit(root, 'DESIGN.md', (text) => text.replace('Figtree', 'Edited font'));
    const result = await report(root);
    expect(result.code).toBe(1);
    expect(result.theme.rows.find((row) => row.artifact === 'design')?.state).toBe('mismatch');
  });

  it.each(['selector', 'mode', 'reduced-motion', 'duplicate', 'cascade'] as const)('retains %s differences', async (change) => {
    const root = theme();
    edit(root, 'ultima-theme.css', (text) => ({
      selector: () => text.replace(':root', '.product'),
      mode: () => text.replace('prefers-color-scheme: light', 'prefers-color-scheme: dark'),
      'reduced-motion': () => text.replace('prefers-reduced-motion: reduce', 'prefers-reduced-motion: no-preference'),
      duplicate: () => text.replace('--ult-radius-md: 4px;', '--ult-radius-md: 4px; --ult-radius-md: 10px;'),
      cascade: () => `@layer other {\n${text}\n}`,
    })[change]());
    const result = await report(root);
    expect(result.code).toBe(1);
    expect(result.theme.rows.find((row) => row.artifact === 'css')?.differences.length).toBeGreaterThan(0);
  });

  it('compares equivalent CSS formatting without treating provenance as proof', async () => {
    const root = theme();
    edit(root, 'ultima-theme.css', (text) => text.replace(/;\n/g, '; ').replace(/\n  /g, ' '));
    expect((await report(root)).theme.rows.find((row) => row.artifact === 'css')?.state).toBe('match');
  });

  it('keeps two independently imported boundaries and ignores an unrelated nearby draft', () => {
    const root = theme('next');
    const grove = presetDraft('grove');
    write(root, 'app/sub/page.tsx', "import './brand.css'; export default function Page() { return <p>Sub</p>; }");
    write(root, 'app/sub/brand.css', toCss(grove));
    write(root, 'app/sub/brand.json', serializeDraft(grove));
    write(root, 'app/sub/unrelated.json', serializeDraft(presetDraft('cinder')));
    const before = snapshot(root);
    const result = doctorTheme(root, 'next');
    expect(snapshot(root)).toEqual(before);
    expect(result.theme.rows.filter((row) => row.artifact === 'css').map((row) => [row.boundary, row.paths.draft, row.state])).toEqual([
      ['app/layout.tsx', 'ultima-theme.json', 'match'], ['app/sub/page.tsx', 'app/sub/brand.json', 'match'],
    ]);
    expect(JSON.stringify(result)).not.toContain('unrelated.json');
  });

  it('distinguishes installed component token reads from inline application overrides', async () => {
    const root = installCatalogue(theme(), { ui: 'src/components/ui', lib: 'src/lib' }, ['button', 'badge']);
    edit(root, 'src/App.tsx', (text) => `import { Button } from '@/components/ui/button';\nimport { Badge } from '@/components/ui/badge';\n${text}`);
    expect((await report(root)).code).toBe(0);
    edit(root, 'src/App.tsx', (text) => `${text}\nconst overrides = { '--ult-radius-md': '33px' };`);
    const result = await report(root);
    expect(result.code).toBe(3);
    expect(result.theme.rows.some((row) => row.state === 'incomplete')).toBe(true);
  });

  it.each([1, 2] as const)('resolves legacy v%s without migration', async (version) => {
    const fixtures = JSON.parse(readFileSync(new URL('../../../tokens/src/__tests__/fixtures/pre-base-theme-drafts.json', import.meta.url), 'utf8'));
    const draft: ThemeDraft = fixtures.cases.find((item: { draft: ThemeDraft }) => item.draft.version === version).draft;
    const original = resolveDraft(draft);
    const root = theme('vite', draft);
    const result = await report(root);
    expect(result.code, JSON.stringify(result.theme)).toBe(0);
    expect(result.theme.rows.find((row) => row.artifact === 'css')?.source).toMatchObject({ draftVersion: version, recipeVersion: draft.recipeVersion });
    expect(resolveDraft(draft)).toEqual(original);
  });

  it('keeps unlinked legacy exports and documents informational', async () => {
    const root = theme();
    write(root, 'ultima-theme.css', withoutProvenance(toCss(stockDraft())));
    write(root, 'DESIGN.md', '# Consumer-owned legacy design document\nKeep the brand.');
    const result = await report(root);
    expect(result.code).toBe(0);
    expect(result.theme.rows.filter((row) => row.artifact !== 'draft').map((row) => row.state)).toEqual(['unlinked', 'unlinked']);
  });

  it.each(['dynamic', 'version', 'recipe', 'expression', 'ambiguous', 'header'] as const)('reports %s as incomplete', async (change) => {
    const root = theme();
    if (change === 'dynamic') edit(root, 'src/main.tsx', (text) => `${text}\nimport('./pending.css');`);
    if (change === 'version') edit(root, 'ultima-theme.json', (text) => text.replace('"version": 3', '"version": 999'));
    if (change === 'recipe') edit(root, 'ultima-theme.json', (text) => text.replace('"recipeVersion": 3', '"recipeVersion": 999'));
    if (change === 'expression') edit(root, 'ultima-theme.css', (text) => text.replace('--ult-radius-md: 4px', '--ult-radius-md: var(--local-radius)'));
    if (change === 'ambiguous') {
      write(root, 'other-theme.css', toCss(stockDraft()));
      edit(root, 'src/main.tsx', (text) => text.replace('../ultima-theme.css', '../other-theme.css'));
      write(root, 'other-theme.json', serializeDraft(stockDraft()));
    }
    if (change === 'header') edit(root, 'ultima-theme.css', (text) => text.replace('ultima-theme:provenance v1', 'ultima-theme:provenance v99'));
    const result = await report(root);
    expect(result.code).toBe(3);
    expect(result.theme.rows.some((row) => row.state === 'incomplete')).toBe(true);
  });

  it('makes blocking setup or theme findings take precedence over incomplete analysis', async () => {
    const root = theme();
    edit(root, 'src/main.tsx', (text) => `${text}\nimport('./pending.css');`);
    edit(root, 'ultima-theme.css', (text) => text.replace('--ult-radius-md: 4px', '--ult-radius-md: 99px'));
    expect((await report(root)).code).toBe(1);
  });

  it('keeps ordinary doctor and check independent and rejects the flag elsewhere', async () => {
    const root = theme();
    edit(root, 'src/main.tsx', (text) => `${text}\nimport('./pending.css');`);
    const ordinary = await run(['doctor', '--json', '--cwd', root]);
    expect(ordinary.code).toBe(0);
    expect(JSON.parse(ordinary.stdout)).not.toHaveProperty('theme');
    expect((await run(['check', '--theme', '--cwd', root])).code).toBe(2);
    expect((await run(['doctor', '--theme=false', '--cwd', root])).code).toBe(2);
  });

  it('does not trust an intact provenance header after all CSS declarations are removed', async () => {
    const root = theme();
    edit(root, 'ultima-theme.css', (text) => text.slice(0, text.indexOf(':root')));
    expect((await report(root)).theme.rows.find((row) => row.artifact === 'css')?.state).toBe('mismatch');
  });

  it('leaves ambiguous identity-only draft copies unresolved', async () => {
    const root = theme();
    write(root, 'src/copy1.json', serializeDraft(stockDraft()));
    write(root, 'src/copy2.json', serializeDraft(stockDraft()));
    write(root, 'src/brand.css', toCss(stockDraft()));
    edit(root, 'src/main.tsx', (text) => text.replace('../ultima-theme.css', './brand.css'));
    expect((await report(root)).code).toBe(3);
  });

  it('cannot certify linked CSS over an overlapping independent consumer override', async () => {
    const root = theme();
    edit(root, 'src/index.css', (text) => `${text}\n:root { --ult-radius-md: 33px; }`);
    const result = await report(root);
    expect(result.code).toBe(3);
    expect(result.theme.rows.find((row) => row.paths.artifact === 'ultima-theme.css')?.state).toBe('incomplete');
  });

  it('reports the actual altered StyleX values and locally inherited reduced motion', async () => {
    const root = installCatalogue(theme(), { ui: 'src/components/ui', lib: 'src/lib' }, ['button']);
    write(root, 'src/ultima-theme.stylex.ts', toStylex(stockDraft()));
    write(root, 'src/ultima-theme.json', serializeDraft(stockDraft()));
    edit(root, 'src/main.tsx', (text) => text.replace("import '../ultima-theme.css';", "import * as stylex from '@stylexjs/stylex';\nimport { ultimaTheme } from './ultima-theme.stylex';\nconst boundary = <div {...stylex.props(ultimaTheme.light)} />;"));
    edit(root, 'src/lib/tokens.stylex.ts', (text) => text.replace("'--ult-motion-fast': { default: '120ms', [REDUCED_MOTION]: '1ms' }", "'--ult-motion-fast': { default: '120ms', [REDUCED_MOTION]: '900ms' }"));
    const result = await report(root);
    const stylex = result.theme.rows.find((row) => row.artifact === 'stylex')!;
    expect(stylex.state).toBe('mismatch');
    expect(stylex.differences).toContainEqual({ location: 'local token reduced motion / --ult-motion-fast', expected: '1ms', actual: '900ms' });
  });

  it('reports missing optional draft and design without resetting a branded application', async () => {
    const root = smoke('vite');
    edit(root, 'src/index.css', (text) => `${text}\n:root { --ult-radius-md: 27px; }`);
    const result = await report(root);
    expect(result.code).toBe(0);
    expect(result.theme.rows.filter((row) => row.artifact === 'draft' || row.artifact === 'design').map((row) => row.state)).toEqual(['unlinked', 'unlinked']);
  });

  it('checks applied generated StyleX content and marks computed selection incomplete', async () => {
    const root = installCatalogue(theme(), { ui: 'src/components/ui', lib: 'src/lib' }, ['button']);
    write(root, 'src/ultima-theme.stylex.ts', toStylex(stockDraft()));
    write(root, 'src/ultima-theme.json', serializeDraft(stockDraft()));
    edit(root, 'src/main.tsx', (text) => text.replace("import '../ultima-theme.css';", "import * as stylex from '@stylexjs/stylex';\nimport { ultimaTheme } from './ultima-theme.stylex';\nconst boundary = <div {...stylex.props(ultimaTheme.dark)} />;"));
    const initial = await report(root);
    expect(initial.theme.rows.find((row) => row.artifact === 'stylex')?.state, JSON.stringify(initial.theme)).toBe('match');
    edit(root, 'src/main.tsx', (text) => text.replace('ultimaTheme.dark', "ultimaTheme[chooseMode()]"));
    expect((await report(root)).code).toBe(3);
  });

  it('compares default document with local installed token edits, never bundled current defaults', () => {
    const root = installCatalogue(smoke('vite'), { ui: 'src/components/ui', lib: 'src/lib' }, ['button']);
    const draft = stockDraft();
    write(root, 'DESIGN.md', toDefaultDesignMd(resolveDraft(draft)));
    const before = doctorTheme(root, 'vite');
    expect(before.theme.rows.find((row) => row.artifact === 'design')).toMatchObject({ state: 'unlinked', coverage: { contentMatches: true } });
    edit(root, 'src/lib/tokens.stylex.ts', (text) => text.replace("'--ult-radius-md': '4px'", "'--ult-radius-md': '22px'"));
    expect(doctorTheme(root, 'vite').theme.rows.find((row) => row.artifact === 'design')?.state).toBe('mismatch');
    expect(readFileSync(join(root, 'DESIGN.md'), 'utf8')).toContain('4px');
  });
});
