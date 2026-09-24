import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { run } from '../run.ts';
import { analysisFixture, installCatalogue, project, smoke, write } from './fixtures.ts';

type Finding = { ruleId: string; severity: string; file: string; start: { line: number }; end: { line: number }; symbol?: string; link: string };
type Report = {
  status: string;
  counts: { errors: number; advisories: number; incomplete: number; suppressions: number };
  unsupported: { step: string; reason: string }[];
  diagnostics: Finding[];
};

const FIXTURES = readdirSync(join(dirname(fileURLToPath(import.meta.url)), '../../../analysis/fixtures/app')).sort();
const VITE = { ui: 'src/components/ui', lib: 'src/lib' };

/** The Vite smoke project with the whole catalogue installed and the checker fixtures under src/fixtures. */
function consumer(fixtures: string[] = FIXTURES): string {
  const root = installCatalogue(smoke('vite'), VITE);
  for (const name of fixtures) write(root, `src/fixtures/${name}`, analysisFixture(`app/${name}`));
  return root;
}

async function check(root: string, ...args: string[]): Promise<{ code: number; report: Report }> {
  const { code, stdout } = await run(['check', '--json', '--cwd', root, ...args]);
  return { code, report: JSON.parse(stdout) };
}

const at = (report: Report, file: string) => report.diagnostics.filter((diagnostic) => diagnostic.file === file);
const lines = (findings: Finding[]) => findings.map(({ ruleId, start }) => `${start.line} ${ruleId}`);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('check', () => {
  let root: string;
  let full: Report;

  beforeAll(async () => {
    root = consumer();
    full = (await check(root)).report;
  });

  it('returns exactly the full run’s findings for each fixture file under --files', async () => {
    for (const name of FIXTURES.filter((file) => file.endsWith('.tsx'))) {
      const file = `src/fixtures/${name}`;
      const { report } = await check(root, '--files', file);
      expect(report.diagnostics, file).toEqual(at(full, file));
    }
  });

  it('blocks on a palette read', async () => {
    expect(lines(at(full, 'src/fixtures/palette.tsx'))).toEqual(['7 ULT-APP-PALETTE-001']);
    const [finding] = at(full, 'src/fixtures/palette.tsx');
    expect(finding).toMatchObject({ severity: 'blocking', symbol: 'styles', link: 'https://ultima.systems/tokens#color' });
    expect((await check(consumer(['palette.tsx']))).code).toBe(1);
  });

  it('advises on a raw color, blocks on it under --strict, and leaves arrangement and semantic tokens alone', async () => {
    // Line 7 is the hex color and 17 the inline font size; padding, gap, width, the token reads and
    // both var(--ult-color-*) reads pass.
    expect(lines(at(full, 'src/fixtures/paint.tsx'))).toEqual(['7 ULT-APP-PAINT-001', '17 ULT-APP-PAINT-001']);
    expect(at(full, 'src/fixtures/paint.tsx')[0]).toMatchObject({ severity: 'advisory', symbol: 'styles.hex', end: { line: 7 }, link: 'https://ultima.systems/tokens#color' });
    const root = consumer(['paint.tsx']);
    expect((await check(root)).code).toBe(0);
    const strict = await check(root, '--strict');
    expect(strict.code).toBe(1);
    expect(strict.report.counts).toMatchObject({ errors: 2, advisories: 2 });
  });

  it('reads var(--ult-color-*) against the bundled tokens when none are installed', async () => {
    const root = smoke('vite');
    write(root, 'src/Card.tsx', "export const Card = () => <div style={{ color: 'var(--ult-color-text)', borderRadius: 'var(--ult-radius-md)' }} />;\n");
    const { code, report } = await check(root);
    expect(report.diagnostics).toEqual([]);
    expect(code).toBe(0);
  });

  it('reports a suppression with no reason and keeps its finding; a valid one removes its finding and counts', () => {
    expect(lines(at(full, 'src/fixtures/suppressed.tsx'))).toEqual(['8 ULT-APP-SUPPRESSION-001', '9 ULT-APP-PAINT-001', '10 ULT-APP-SUPPRESSION-001']);
    expect(full.counts.suppressions).toBe(1);
  });

  it('lists a Tailwind className, a CSS module and a computed inline style as unsupported analysis', () => {
    const steps = full.unsupported.map(({ step }) => step);
    expect(steps).toContain('Tailwind and other class names: src/fixtures/unsupported.tsx:6,7');
    expect(steps).toContain('CSS modules: src/fixtures/unsupported.tsx:2');
    expect(steps).toContain('Computed inline styles: src/fixtures/unsupported.tsx:7');
    expect(at(full, 'src/fixtures/unsupported.tsx')).toEqual([]);
  });

  it('adds counts of errors, advisories and suppressions to JSON', () => {
    expect(full.counts).toEqual({ errors: 1, advisories: 5, incomplete: 0, suppressions: 1 });
  });

  it('lists and skips a --files path outside the scope or missing', async () => {
    const { report } = await check(root, '--files', 'src/fixtures/paint.tsx', 'index.html', 'src/gone.tsx');
    expect(report.unsupported.slice(0, 2).map(({ step }) => step)).toEqual(['Skipped: index.html', 'Skipped: src/gone.tsx']);
    expect(new Set(report.diagnostics.map(({ file }) => file))).toEqual(new Set(['src/fixtures/paint.tsx']));
  });

  it('never reads tests or build output', async () => {
    const root = smoke('vite');
    for (const path of ['src/Card.test.tsx', 'src/__tests__/card.tsx', 'src/Card.spec.tsx', 'dist/assets/index.js']) {
      write(root, path, "export const Card = () => <p style={{ color: '#f00' }} />;\n");
    }
    expect((await check(root)).report.diagnostics).toEqual([]);
  });
});

describe('check on the smoke-install projects', () => {
  it.each([
    ['vite', VITE],
    ['next', { ui: 'components/ui', lib: 'lib' }],
  ] as const)('exits 0 offline on %s with the catalogue installed', async (target, directories) => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('check fetched')));
    const root = installCatalogue(smoke(target), directories);
    const { code, report } = await check(root);
    expect(report.diagnostics).toEqual([]);
    expect(code).toBe(0);
  });

  it('is incomplete with a repair naming doctor when components.json is missing', async () => {
    const root = smoke('vite');
    rmSync(join(root, 'components.json'));
    const { code, stdout } = await run(['check', '--json', '--cwd', root]);
    expect(code).toBe(3);
    expect(JSON.parse(stdout).diagnostics[0]).toMatchObject({ severity: 'incomplete', file: 'components.json', repair: expect.stringMatching(/doctor/) });
  });

  it('refuses paths without --files', async () => {
    const { code } = await run(['check', '--cwd', project(), 'src/App.tsx']);
    expect(code).toBe(2);
  });
});

describe('the built binary', () => {
  it('inlines @ultima/analysis rather than importing it', () => {
    const bundle = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../dist/cli.js'), 'utf8');
    expect(bundle).not.toMatch(/(from|import\()\s*["']@ultima\//);
    expect(bundle).toContain('ULT-APP-PAINT-001');
  });
});
