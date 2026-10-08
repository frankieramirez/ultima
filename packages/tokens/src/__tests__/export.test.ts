import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from 'vitest';
import ts from 'typescript';

import { draftFingerprint, parseDraft, serializeDraft } from '../theme/codec.ts';
import { resolveDraft, stockDraft } from '../theme/draft.ts';
import { toCss, toDesignMd, toRegistryItem, toStylex } from '../theme/export.ts';

const GROUPS = ['color', 'space', 'text', 'font', 'radius', 'shadow', 'filter', 'motion'] as const;

function headerMentions(source: string, draft = stockDraft()) {
  const head = source.slice(0, source.indexOf('\n', source.indexOf('*/')));
  expect(head).toMatch(/studio v1/i);
  expect(head).toContain(`draft v${draft.version}`);
  expect(head).toContain(draftFingerprint(draft));
}

test('toCss emits the contracted blocks and fixed reduced-motion values', () => {
  const draft = stockDraft();
  draft.motion = 0.6;
  const css = toCss(draft);
  const tables = resolveDraft(draft);

  headerMentions(css, draft);
  expect(css).not.toMatch(/@layer/);
  expect(css).toMatch(/:root \{\n  color-scheme: dark;/);
  expect(css).toMatch(
    /@media \(prefers-color-scheme: light\) \{\n  :root \{\n    color-scheme: light;/,
  );
  expect(css).toMatch(/\[data-theme="dark"\] \{\n  color-scheme: dark;/);
  expect(css).toMatch(/\[data-theme="light"\] \{\n  color-scheme: light;/);
  expect(css).toContain(`--ult-motion-fast: ${tables.dark['--ult-motion-fast']};`);
  expect(css).toContain(`--ult-space-1: ${tables.dark['--ult-space-1']};`);
  for (const group of GROUPS) {
    expect(css).toContain(`--ult-${group}-`);
  }
  expect(css).toMatch(
    /@media \(prefers-reduced-motion: reduce\) \{\n  :root,\n  \[data-theme="dark"\],\n  \[data-theme="light"\] \{\n    --ult-motion-fast: 1ms;\n    --ult-motion-base: 1ms;\n    --ult-motion-slow: 1ms;\n    --ult-motion-loop: 0s;/,
  );
  const darkBlock = css.slice(css.indexOf('[data-theme="dark"]'), css.indexOf('[data-theme="light"]'));
  const lightBlock = css.slice(css.indexOf('[data-theme="light"]'), css.indexOf('@media (prefers-reduced-motion'));
  for (const mode of ['dark', 'light'] as const) {
    const block = mode === 'dark' ? darkBlock : lightBlock;
    for (const [name, value] of Object.entries(tables[mode])) {
      expect(block).toContain(`${name}: ${value};`);
    }
  }
});

test('toCss names failing pairings on an invalid draft', () => {
  const draft = stockDraft();
  draft.overrides.dark['--ult-color-text'] = '#777777';
  draft.overrides.dark['--ult-color-surface'] = '#070707';
  expect(toCss(draft)).toMatch(/failed token-contrast pairings/i);
});

test('toStylex emits full per-group per-mode themes', () => {
  const draft = stockDraft();
  draft.overrides.dark['--ult-color-accent'] = '#ff00aa';
  const source = toStylex(draft);
  headerMentions(source, draft);
  expect([...source.matchAll(/createTheme\((\w+),/g)].map((match) => match[1])).toEqual([
    ...GROUPS,
    ...GROUPS,
  ]);
  expect(source).toContain('export const ultimaTheme');
  expect(source).toContain('ultimaTheme');
  expect(source).toContain("colorScheme: 'dark'");
  expect(source).toContain("colorScheme: 'light'");
  expect(source).toContain('"--ult-color-accent": "#ff00aa"');
  expect(source).toContain('"--ult-color-surface"');
  expect(source).toContain('"--ult-space-12"');
  expect(source).toContain('"--ult-motion-fast": {');
  expect(source).toContain(`'@media (prefers-reduced-motion: reduce)': "1ms"`);
  expect(source).toContain(`'@media (prefers-reduced-motion: reduce)': "0s"`);
  const tables = resolveDraft(draft);
  const colorThemes = [...source.matchAll(/createTheme\(color, \{([\s\S]*?)\n\}\);/g)];
  expect(colorThemes).toHaveLength(2);
  for (const block of colorThemes) {
    for (const name of Object.keys(tables.dark).filter((token) => token.startsWith('--ult-color-'))) {
      expect(block[1]).toContain(name);
    }
  }
});

test.each([
  ['stock', stockDraft().typography.sans],
  ['newline', "'Example',\n sans-serif"],
  ['carriage return', "'Example',\r sans-serif"],
  ['CRLF', "'Example',\r\n sans-serif"],
  ['quotes', `'Example', "Another", sans-serif`],
  ['backslashes', String.raw`'Example\20 Font', sans-serif`],
  ['Unicode separators', "'Example\u2028Font\u2029Family', sans-serif"],
])('toStylex preserves accepted %s font stacks in valid TypeScript', (_, value) => {
  const draft = stockDraft();
  draft.typography.sans = value;
  draft.typography.mono = value;
  draft.overrides.dark['--ult-font-sans'] = value;
  const parsed = parseDraft(JSON.stringify(draft));
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) throw new Error('Font stack was rejected');
  const source = toStylex(parsed.draft);
  const compiled = ts.transpileModule(source, { reportDiagnostics: true });
  expect(compiled.diagnostics).toEqual([]);
  const module = ts.createSourceFile('theme.ts', source, ts.ScriptTarget.Latest, true);
  const values: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name)
      && ['--ult-font-sans', '--ult-font-mono'].includes(node.name.text)
      && ts.isStringLiteral(node.initializer)) {
      values.push(node.initializer.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(module);
  expect(values).toEqual([value, value, value, value]);
});

test('toDesignMd uses the resolved dark and light values, including edits', () => {
  const draft = stockDraft();
  draft.overrides.light['--ult-color-accent'] = '#123456';
  const document = toDesignMd(draft);
  const tables = resolveDraft(draft);
  expect(document).toContain(draftFingerprint(draft));
  expect(document).toContain(`| \`--ult-color-accent\` | ${tables.dark['--ult-color-accent']} | #123456 |`);
  expect(document).toContain(`| \`--ult-font-sans\` | ${tables.dark['--ult-font-sans']} |`);
  expect(document).toContain('## Component styling');
});

test('toDesignMd preserves Markdown characters in accepted font stacks', () => {
  const draft = stockDraft();
  draft.typography.sans = String.raw`'Example_*[Font]\20', sans-serif`;
  expect(parseDraft(serializeDraft(draft)).ok).toBe(true);
  expect(toDesignMd(draft)).toContain(String.raw`'Example\_\*\[Font\]\\20', sans-serif`);
});

test('toDesignMd preserves backticks and pipes in accepted font stacks', () => {
  const draft = stockDraft();
  draft.typography.sans = "'Example`|Font', sans-serif";
  expect(parseDraft(serializeDraft(draft)).ok).toBe(true);
  expect(toDesignMd(draft)).toContain("'Example\\`\\|Font', sans-serif");
});

test('toRegistryItem is a universal item carrying the stylesheet, draft, and design document', () => {
  const draft = stockDraft();
  const json = toRegistryItem(draft);
  const item = JSON.parse(json) as {
    type: string;
    files: { path: string; type: string; target: string; content: string }[];
  };
  expect(item.type).toBe('registry:item');
  expect(item.files).toHaveLength(3);
  for (const file of item.files) {
    expect(file.type).toBe('registry:file');
    expect(file.target).toBeTruthy();
  }
  expect(item.files.map((file) => file.target)).toEqual([
    '~/ultima-theme.css',
    '~/ultima-theme.json',
    '~/DESIGN.md',
  ]);
  expect(item.files[0]?.content).toBe(toCss(draft));
  expect(item.files[1]?.content).toBe(serializeDraft(draft));
  expect(item.files[2]?.content).toBe(toDesignMd(draft));
});

test('npx shadcn add installs the registry item without components.json', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ultima-theme-'));
  const draft = stockDraft();
  try {
    writeFileSync(join(dir, 'ultima-theme.registry.json'), toRegistryItem(draft));
    execFileSync('npx', ['--yes', 'shadcn@latest', 'add', './ultima-theme.registry.json', '--overwrite'], {
      cwd: dir,
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(existsSync(join(dir, 'components.json'))).toBe(false);
    expect(readFileSync(join(dir, 'ultima-theme.css'), 'utf8')).toBe(toCss(draft));
    expect(readFileSync(join(dir, 'ultima-theme.json'), 'utf8')).toBe(serializeDraft(draft));
    expect(readFileSync(join(dir, 'DESIGN.md'), 'utf8')).toBe(toDesignMd(draft));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 60_000);
