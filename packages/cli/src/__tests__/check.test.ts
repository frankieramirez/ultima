import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { PAIRINGS } from '../../../tokens/src/theme/gate.ts';
import { parseColor } from '../../../analysis/src/rules/theme.ts';
import { bundledColorDefaults } from '../../scripts/bundled.ts';
import { run } from '../run.ts';
import { analysisFixture, installCatalogue, project, smoke, write } from './fixtures.ts';

type Finding = {
  ruleId: string;
  severity: string;
  file: string;
  start: { line: number };
  end: { line: number };
  symbol?: string;
  target?: string;
  selector?: string;
  message: string;
  repair: string;
  link: string;
};
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
    for (const name of FIXTURES.filter((file) => /\.(tsx|css)$/.test(file) && !file.endsWith('.module.css'))) {
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

  it('advises on a Base UI import an installed item wraps, by subpath or from the barrel, and passes types and hooks', () => {
    expect(lines(at(full, 'src/fixtures/primitive.tsx'))).toEqual(['2 ULT-APP-PRIMITIVE-001', '3 ULT-APP-PRIMITIVE-001']);
    expect(at(full, 'src/fixtures/primitive.tsx')[0]).toMatchObject({
      severity: 'advisory',
      target: '@base-ui/react/select',
      link: 'https://ultima.systems/components/select',
    });
  });

  it('exempts the installed item’s own import of the primitive it wraps', () => {
    expect(at(full, 'src/components/ui/select.tsx')).toEqual([]);
    expect(full.diagnostics.filter(({ file }) => file.startsWith('src/components/ui/'))).toEqual([]);
  });

  it('advises on a native control or a widget role an installed item provides, and passes one handed to an Ultima render', () => {
    // 14 <button>, 15 role="button", 18 a <button> handed to a render prop that is not Ultima's, 19 and 20
    // the email and checkbox inputs, 22 a computed input type, 24 createElement('textarea'). <Button render={<a />}>,
    // <Tabs.Tab render={<button />}>, the file input and role="region" pass.
    expect(lines(at(full, 'src/fixtures/controls.tsx'))).toEqual([
      '14 ULT-APP-CONTROL-001',
      '15 ULT-APP-CONTROL-001',
      '18 ULT-APP-CONTROL-001',
      '19 ULT-APP-CONTROL-001',
      '20 ULT-APP-CONTROL-001',
      '22 ULT-ANALYSIS-001',
      '24 ULT-APP-CONTROL-001',
    ]);
    const [button, role] = at(full, 'src/fixtures/controls.tsx');
    expect(button).toMatchObject({ severity: 'advisory', symbol: 'Controls', link: 'https://ultima.systems/components/button' });
    expect(role).toMatchObject({ target: 'A <div> with role="button"', link: 'https://ultima.systems/components/button' });
    expect(at(full, 'src/fixtures/controls.tsx')[5]).toMatchObject({ severity: 'advisory' });
  });

  it('counts only the items this project installed', async () => {
    const root = installCatalogue(smoke('vite'), VITE, ['select']);
    write(root, 'src/fixtures/controls.tsx', analysisFixture('app/controls.tsx').replace(/^import \{ (Button|Tabs) \}.*\n/gm, ''));
    write(root, 'src/fixtures/primitive.tsx', analysisFixture('app/primitive.tsx'));
    const { code, report } = await check(root);
    // Without button, input, checkbox, textarea or dialog installed, only the select import is left.
    expect(lines(report.diagnostics)).toEqual(['2 ULT-APP-PRIMITIVE-001']);
    expect(code).toBe(0);
    expect((await check(root, '--strict')).code).toBe(1);
  });

  it('blocks on a primitive import and a native control under --strict', async () => {
    const root = installCatalogue(smoke('vite'), VITE, ['button', 'select']);
    write(root, 'src/Form.tsx', "import { Select } from '@base-ui/react/select';\nexport const Form = () => <Select.Root><button /></Select.Root>;\n");
    expect((await check(root)).code).toBe(0);
    const strict = await check(root, '--strict');
    expect(lines(strict.report.diagnostics)).toEqual(['1 ULT-APP-PRIMITIVE-001', '2 ULT-APP-CONTROL-001']);
    expect(strict.report.counts).toMatchObject({ errors: 2, advisories: 2 });
    expect(strict.code).toBe(1);
  });

  it('blocks a role base override without its states, with a repair naming the missing tokens', async () => {
    const findings = at(full, 'src/fixtures/theme-state.tsx');
    expect(lines(findings)).toEqual(['8 ULT-APP-THEME-001']);
    expect(findings[0]).toMatchObject({ severity: 'blocking', symbol: 'brand', target: '--ult-color-accent', link: 'https://ultima.systems/tokens#overriding' });
    expect(findings[0]?.message).toMatch(/in dark mode/);
    expect(findings[0]?.repair).toBe('Set --ult-color-accent-hover and --ult-color-accent-active in the same override, next to --ult-color-accent.');
    expect((await check(consumer(['theme-state.tsx']))).code).toBe(1);
  });

  it('checks an override in each mode it applies to: unbound and dark-bound block, light-bound passes', async () => {
    // CSS: .unbound on line 5 and the dark block on line 10 fail on the dark surfaces; the light block passes.
    const css = at(full, 'src/fixtures/theme-contrast.css');
    expect(lines(css)).toEqual(['5 ULT-APP-CONTRAST-001', '10 ULT-APP-CONTRAST-001']);
    expect(css.map(({ selector }) => selector)).toEqual(['.unbound', '@media (prefers-color-scheme: dark) .dark']);
    for (const finding of css) {
      expect(finding).toMatchObject({ severity: 'blocking', target: '--ult-color-text-subtle', link: 'https://ultima.systems/tokens#pairings' });
      expect(finding.message).toMatch(/in dark mode: text-subtle on surface is 2\.55:1 against 4\.5:1/);
      expect(finding.message).not.toMatch(/light mode/);
    }
    // StyleX: applied alone and beside darkTheme block; beside lightTheme passes.
    const stylex = at(full, 'src/fixtures/theme-contrast.tsx');
    expect(stylex.map(({ ruleId, symbol }) => `${symbol} ${ruleId}`)).toEqual(['quiet ULT-APP-CONTRAST-001', 'quietDark ULT-APP-CONTRAST-001']);
    expect((await check(consumer(['theme-contrast.tsx', 'theme-contrast.css']))).code).toBe(1);
  });

  it('passes an override bound to the mode it was designed for', async () => {
    const root = smoke('vite');
    write(root, 'src/main.tsx', "import './index.css'\nimport './theme.css'\n");
    write(root, 'src/theme.css', '@media (prefers-color-scheme: light) {\n  :root { --ult-color-text-subtle: #555555; }\n}\n');
    const { code, report } = await check(root);
    expect(report.diagnostics).toEqual([]);
    expect(code).toBe(0);
  });

  it('is incomplete when a createTheme value comes from an import it does not follow', async () => {
    expect(at(full, 'src/fixtures/theme-import.tsx').map(({ ruleId, severity, target }) => `${ruleId} ${severity} ${target}`)).toEqual([
      'ULT-ANALYSIS-001 incomplete --ult-color-accent',
      'ULT-ANALYSIS-001 incomplete --ult-color-accent-hover',
      'ULT-ANALYSIS-001 incomplete --ult-color-accent-active',
    ]);
    const { code, report } = await check(consumer(['theme-import.tsx']));
    expect(report.status).toBe('incomplete');
    expect(code).toBe(3);
  });

  it('measures CSS overrides layered by mode, as the cascade applies them', async () => {
    const root = smoke('vite');
    write(root, 'src/main.tsx', "import './index.css'\nimport './theme.css'\n");
    write(
      root,
      'src/theme.css',
      [
        ':root { --ult-color-accent: #7b8cff; --ult-color-accent-hover: #8e9dff; --ult-color-accent-active: #a3b0ff; }',
        '@media (prefers-color-scheme: light) {',
        '  :root { --ult-color-accent: #4f58d6; --ult-color-accent-hover: #454dc6; --ult-color-accent-active: #3c42b8; }',
        '}',
        '',
      ].join('\n'),
    );
    const { code, report } = await check(root);
    expect(report.diagnostics).toEqual([]);
    expect(code).toBe(0);
  });

  it('adds counts of errors, advisories and suppressions to JSON', () => {
    expect(full.counts).toEqual({ errors: 6, advisories: 14, incomplete: 3, suppressions: 1 });
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

describe('theme overrides', () => {
  it('bundles an opaque default for every token the contrast gate pairs, in both modes', () => {
    const defaults = bundledColorDefaults(join(dirname(fileURLToPath(import.meta.url)), '../../../..'));
    for (const mode of ['dark', 'light'] as const) {
      for (const { foreground, background } of PAIRINGS) {
        expect(parseColor(defaults[mode][foreground] ?? ''), `${mode} ${foreground}`).toMatch(/^#[0-9a-f]{6}$/);
        expect(parseColor(defaults[mode][background] ?? ''), `${mode} ${background}`).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('measures hex and rgb() colors, and refuses what it cannot measure', () => {
    expect(parseColor('#abc')).toBe('#aabbcc');
    expect(parseColor('#AABBCCFF')).toBe('#aabbcc');
    expect(parseColor('rgb(255 0 0)')).toBe('#ff0000');
    expect(parseColor('rgba(0, 128, 255, 1)')).toBe('#0080ff');
    expect(parseColor('#14151680')).toMatchObject({ reason: expect.stringMatching(/translucent/) });
    expect(parseColor('rgb(0 0 0 / 50%)')).toMatchObject({ reason: expect.stringMatching(/translucent/) });
    expect(parseColor('oklch(70% 0.1 250)')).toMatchObject({ reason: expect.stringMatching(/not a color the checker can measure/) });
  });

  it('reads a conditional createTheme value per mode, and follows var() to another semantic token', async () => {
    const root = installCatalogue(smoke('vite'), VITE);
    write(
      root,
      'src/theme.tsx',
      [
        "import * as stylex from '@stylexjs/stylex';",
        "import { color } from '@/lib/tokens.stylex';",
        '',
        'export const quiet = stylex.createTheme(color, {',
        "  '--ult-color-text-subtle': { default: '#9a9a9a', '@media (prefers-color-scheme: light)': '#555555' },",
        '});',
        '',
      ].join('\n'),
    );
    write(root, 'src/main.tsx', "import './index.css'\nimport './theme.css'\n");
    write(root, 'src/theme.css', '.card { --ult-color-text-muted: var(--ult-color-surface); }\n.odd { --ult-color-text: var(--brand-ink); }\n');
    const { code, report } = await check(root);
    expect(report.diagnostics.map(({ file, ruleId, severity }) => `${file} ${ruleId} ${severity}`)).toEqual([
      'src/theme.css ULT-APP-CONTRAST-001 blocking',
      'src/theme.css ULT-ANALYSIS-001 incomplete',
    ]);
    expect(report.diagnostics[0]?.message).toMatch(/in dark mode: text-muted on surface is 1\.00:1/);
    expect(code).toBe(1);
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
    expect(bundle).toContain('ULT-APP-CONTROL-001');
  });
});
