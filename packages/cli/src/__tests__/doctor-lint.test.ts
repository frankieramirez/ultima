import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../diagnostic.ts';
import { LINT_PINS, type LintReport } from '../lint.ts';
import { run } from '../run.ts';
import { edit, project, smoke, snapshot, write } from './fixtures.ts';

type DoctorReport = { target: string | null; diagnostics: Diagnostic[]; lint: LintReport };
type Layout = 'vite' | 'next-app' | 'next-src';

const FRAGMENT = readFileSync(new URL('../../../../apps/docs/public/ultima.eslint.mjs', import.meta.url), 'utf8');
const NOT_CONFIGURED = 'StyleX lint is not configured; syntax validation remains unverified';
const WALKTHROUGH_MINIMAL = `import tseslint from 'typescript-eslint';
import { ultimaStylex } from './ultima.eslint.mjs';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/out/**', '**/coverage/**'] },
  {
    files: ultimaStylex.files,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  ultimaStylex,
];
`;
const WALKTHROUGH_NEXT = `import { ultimaStylex } from './ultima.eslint.mjs';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ultimaStylex,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
`;

const base = (layout: Layout) => (layout === 'next-app' ? '' : 'src/');
const entry = (layout: Layout) => (layout === 'vite' ? 'src/App.tsx' : `${base(layout)}app/page.tsx`);

function app(layout: Layout): string {
  const root = smoke(layout === 'vite' ? 'vite' : 'next');
  if (layout === 'next-src') {
    mkdirSync(join(root, 'src'));
    renameSync(join(root, 'app'), join(root, 'src/app'));
    edit(root, 'tsconfig.json', (text) => text.replace('"./*"', '"./src/*"'));
  }
  write(root, `${base(layout)}components/ui/button.tsx`, 'export function Button() {\n  return <button />;\n}\n');
  write(root, `${base(layout)}lib/tokens.stylex.ts`, "import * as stylex from '@stylexjs/stylex';\n");
  return root;
}

function stylexVersion(root: string): string {
  return JSON.parse(readFileSync(join(root, 'node_modules/@stylexjs/stylex/package.json'), 'utf8')).version;
}

function installPackage(root: string, name: string, version: string) {
  write(root, `node_modules/${name}/package.json`, JSON.stringify({ name, version }));
}

/** Moves the StyleX runtime and compiler packages the fixture installed to one older version, as a project init pinned earlier would have. */
function olderStylex(root: string, version: string) {
  for (const name of ['@stylexjs/stylex', '@stylexjs/unplugin', '@stylexjs/babel-plugin', '@stylexjs/postcss-plugin']) {
    if (existsSync(join(root, 'node_modules', name, 'package.json'))) installPackage(root, name, version);
  }
}

function withLintRecipe(layout: Layout): string {
  const root = app(layout);
  installPackage(root, 'eslint', LINT_PINS.eslint);
  installPackage(root, 'typescript-eslint', LINT_PINS['typescript-eslint']);
  installPackage(root, '@typescript-eslint/parser', LINT_PINS['typescript-eslint']);
  installPackage(root, '@stylexjs/eslint-plugin', stylexVersion(root));
  if (layout !== 'vite') installPackage(root, 'eslint-config-next', '16.4.0');
  write(root, 'ultima.eslint.mjs', FRAGMENT);
  write(root, 'eslint.config.mjs', layout === 'vite' ? WALKTHROUGH_MINIMAL : WALKTHROUGH_NEXT);
  return root;
}

async function doctorJson(root: string, ...flags: string[]) {
  const before = snapshot(root);
  const result = await run(['doctor', '--json', '--cwd', root, ...flags]);
  expect(snapshot(root)).toEqual(before);
  return { code: result.code, report: JSON.parse(result.stdout) as DoctorReport };
}

const rules = (report: DoctorReport) => report.lint.diagnostics.map(({ ruleId }) => ruleId);

describe.each(['vite', 'next-app', 'next-src'] as const)('doctor StyleX lint in %s', (layout) => {
  async function advisoryLint(root: string): Promise<DoctorReport> {
    const { code, report } = await doctorJson(root);
    const baseline = await doctorJson(app(layout));
    expect(code).toBe(baseline.code);
    expect(report.diagnostics).toEqual(baseline.report.diagnostics);
    expect(report.diagnostics.some(({ ruleId }) => ruleId.startsWith('ULT-LINT'))).toBe(false);
    expect(report.lint.diagnostics.every(({ severity }) => severity === 'advisory')).toBe(true);
    expect(report.lint.effective).toBe('unverified');
    return report;
  }

  it('reports the applied recipe as detected, never as a pass, with the local commands', async () => {
    const report = await advisoryLint(withLintRecipe(layout));
    expect(report.lint).toMatchObject({ state: 'detected', config: 'eslint.config.mjs', diagnostics: [], effective: 'unverified' });
    expect(report.lint.files).toEqual([entry(layout), `${base(layout)}components/ui/button.tsx`, `${base(layout)}lib/tokens.stylex.ts`]);
    expect(report.lint.commands).toEqual([...report.lint.files.map((file) => `npx --no-install eslint --print-config ${file}`), 'npx --no-install eslint .']);
  });

  it('advises when there is no ESLint', async () => {
    const report = await advisoryLint(app(layout));
    expect(report.lint.state).toBe('not-configured');
    expect(report.lint.diagnostics).toEqual([expect.objectContaining({ ruleId: 'ULT-LINT-001', severity: 'advisory', file: '.' })]);
    expect(report.lint.diagnostics[0]!.message).toBe(`${NOT_CONFIGURED}: no ESLint package resolves and the project root has no ESLint config.`);
    expect(report.lint.diagnostics[0]!.repair).toContain(`eslint@${LINT_PINS.eslint} typescript-eslint@${LINT_PINS['typescript-eslint']} @stylexjs/eslint-plugin@${LINT_PINS['@stylexjs/eslint-plugin']}`);
    expect(report.lint.diagnostics[0]!.repair).toContain('https://ultima.systems/install#stylex-lint');
  });

  it('advises when ESLint is installed without a config', async () => {
    const root = withLintRecipe(layout);
    rmSync(join(root, 'eslint.config.mjs'));
    const report = await advisoryLint(root);
    expect(report.lint.state).toBe('not-configured');
    expect(report.lint.diagnostics[0]!.message).toBe(`${NOT_CONFIGURED}: ESLint is installed, but the project root has no eslint.config.* file.`);
  });

  it('advises when the plugin is missing', async () => {
    const root = withLintRecipe(layout);
    rmSync(join(root, 'node_modules/@stylexjs/eslint-plugin'), { recursive: true });
    const report = await advisoryLint(root);
    expect(report.lint.state).toBe('unverified');
    expect(report.lint.diagnostics).toEqual([expect.objectContaining({ ruleId: 'ULT-LINT-002', file: 'ultima.eslint.mjs', start: { line: expect.any(Number), column: expect.any(Number) } })]);
    expect(report.lint.diagnostics[0]!.repair).toContain(`@stylexjs/eslint-plugin@${stylexVersion(root)}`);
  });

  it('advises when the config never registers the plugin', async () => {
    const root = withLintRecipe(layout);
    rmSync(join(root, 'node_modules/@stylexjs/eslint-plugin'), { recursive: true });
    rmSync(join(root, 'ultima.eslint.mjs'));
    edit(root, 'eslint.config.mjs', (text) => text.replace(/^import \{ ultimaStylex \}.*\n/m, '').replace(/^ {2}ultimaStylex,\n/m, '').replace('ultimaStylex.files', "['**/*.tsx']"));
    const report = await advisoryLint(root);
    expect(report.lint.state).toBe('not-configured');
    expect(report.lint.diagnostics).toEqual([expect.objectContaining({ ruleId: 'ULT-LINT-001', message: `${NOT_CONFIGURED}: eslint.config.mjs does not register @stylexjs/eslint-plugin.` })]);
  });

  it('advises when the plugin version differs from the StyleX runtime', async () => {
    const root = withLintRecipe(layout);
    installPackage(root, '@stylexjs/eslint-plugin', '0.0.1');
    const report = await advisoryLint(root);
    expect(rules(report)).toEqual(['ULT-LINT-003']);
    expect(report.lint.diagnostics[0]!.message).toContain(`@stylexjs/eslint-plugin 0.0.1 differs from @stylexjs/stylex ${stylexVersion(root)}`);
  });

  it('moves a StyleX runtime below the tested plugin up, never the plugin down', async () => {
    const root = withLintRecipe(layout);
    olderStylex(root, '0.19.0');
    const report = await advisoryLint(root);
    expect(rules(report)).toEqual(['ULT-LINT-003']);
    const [diagnostic] = report.lint.diagnostics;
    expect(diagnostic!.message).toContain(`differs from @stylexjs/stylex 0.19.0, an unverified combination: the recipe requires both at one version, tested at ${LINT_PINS['@stylexjs/eslint-plugin']}`);
    expect(diagnostic!.repair).toContain(`@stylexjs/stylex@${LINT_PINS['@stylexjs/eslint-plugin']}`);
    expect(diagnostic!.repair).not.toContain('@stylexjs/eslint-plugin@0.19.0');
  });

  it('advises when the runtime and plugin agree below the tested version', async () => {
    const root = withLintRecipe(layout);
    olderStylex(root, '0.19.0');
    installPackage(root, '@stylexjs/eslint-plugin', '0.19.0');
    const report = await advisoryLint(root);
    expect(rules(report)).toEqual(['ULT-LINT-003']);
    expect(report.lint.diagnostics[0]!.message).toContain(`below the tested ${LINT_PINS['@stylexjs/eslint-plugin']}`);
    expect(report.lint.diagnostics[0]!.repair).toContain(`@stylexjs/eslint-plugin@${LINT_PINS['@stylexjs/eslint-plugin']}`);
  });

  it('advises when a required TSX path is ignored', async () => {
    const root = withLintRecipe(layout);
    edit(root, 'eslint.config.mjs', (text) => text.replace('  ultimaStylex,\n', `  ultimaStylex,\n  { ignores: ['${base(layout)}components/ui/**'] },\n`));
    const report = await advisoryLint(root);
    expect(report.lint.diagnostics).toEqual([expect.objectContaining({ ruleId: 'ULT-LINT-004', file: 'eslint.config.mjs' })]);
    expect(report.lint.diagnostics[0]!.message).toContain(`covers ${base(layout)}components/ui/button.tsx`);
  });

  it('advises on an ESLint 8 legacy config without reading or migrating it', async () => {
    const root = withLintRecipe(layout);
    rmSync(join(root, 'eslint.config.mjs'));
    write(root, '.eslintrc.json', JSON.stringify({ plugins: ['@stylexjs'] }));
    installPackage(root, 'eslint', '8.57.1');
    const report = await advisoryLint(root);
    expect(report.lint).toMatchObject({ state: 'unverified', config: '.eslintrc.json' });
    expect(report.lint.diagnostics.map(({ ruleId, file }) => [ruleId, file])).toEqual([['ULT-LINT-003', '.eslintrc.json'], ['ULT-LINT-003', 'package.json']]);
    expect(report.lint.diagnostics[0]!.message).toContain('ESLint 8 legacy config');
    expect(report.lint.diagnostics[1]!.message).toContain('eslint 8.57.1 is an unverified combination');
  });
});

describe('doctor StyleX lint', () => {
  it('names ESLint 10 as an unverified combination', async () => {
    const root = withLintRecipe('vite');
    installPackage(root, 'eslint', '10.2.0');
    const { report } = await doctorJson(root);
    expect(report.lint.state).toBe('unverified');
    expect(report.lint.diagnostics).toEqual([expect.objectContaining({ ruleId: 'ULT-LINT-003', message: expect.stringContaining('eslint 10.2.0 is an unverified combination; the recipe is tested with 9.39.5') })]);
  });

  it('names what it cannot determine about a custom integration', async () => {
    const root = withLintRecipe('vite');
    rmSync(join(root, 'ultima.eslint.mjs'));
    installPackage(root, '@acme/eslint-config', '1.0.0');
    write(root, 'eslint.config.mjs', "import acme from '@acme/eslint-config';\n\nexport default acme;\n");
    const { report } = await doctorJson(root);
    expect(report.lint.state).toBe('unverified');
    expect(report.lint.diagnostics).toEqual([expect.objectContaining({ ruleId: 'ULT-LINT-003', message: expect.stringContaining('doctor cannot determine whether this custom integration applies the StyleX rules') })]);
  });

  it('reads a config that throws on import as text, never evaluating it', async () => {
    const root = withLintRecipe('vite');
    edit(root, 'eslint.config.mjs', (text) => `import { writeFileSync } from 'node:fs';\nwriteFileSync(new URL('./evaluated', import.meta.url), 'yes');\nthrow new Error('doctor evaluated eslint.config.mjs');\n${text}`);
    edit(root, 'ultima.eslint.mjs', (text) => `throw new Error('doctor evaluated ultima.eslint.mjs');\n${text}`);
    const { code, report } = await doctorJson(root);
    expect(code).toBe(0);
    expect(report.lint.state).toBe('detected');
    expect(existsSync(join(root, 'evaluated'))).toBe(false);
  });

  it('advises when the config does not parse', async () => {
    const root = withLintRecipe('vite');
    edit(root, 'eslint.config.mjs', (text) => `${text}\nexport const broken = [;\n`);
    const { report } = await doctorJson(root);
    expect(report.lint.diagnostics).toEqual([expect.objectContaining({ ruleId: 'ULT-LINT-005', file: 'eslint.config.mjs', start: { line: 16, column: 24 } })]);
  });

  it('advises when a later override lowers valid-styles', async () => {
    const root = withLintRecipe('next-app');
    edit(root, 'eslint.config.mjs', (text) => text.replace('  ultimaStylex,\n', "  ultimaStylex,\n  { rules: { '@stylexjs/valid-styles': 'off' } },\n"));
    const { report } = await doctorJson(root);
    expect(report.lint.diagnostics).toEqual([expect.objectContaining({ ruleId: 'ULT-LINT-006', message: expect.stringContaining("sets @stylexjs/valid-styles to 'off'") })]);
  });

  it('is not applicable without StyleX source', async () => {
    const { report } = await doctorJson(project());
    expect(report.lint).toMatchObject({ state: 'not-applicable', diagnostics: [], commands: [] });
  });

  it('prints lint as its own section after the setup findings', async () => {
    const root = app('vite');
    const { code, stdout } = await run(['doctor', '--cwd', root]);
    expect(code).toBe(0);
    const [setup, lint] = stdout.split('\nStyleX lint (static, read-only; ESLint not run):\n');
    expect(setup).toContain('No findings.');
    expect(lint).toContain('  not-configured  (no ESLint config)');
    expect(lint).toContain(`  .  advisory  ULT-LINT-001\n    ${NOT_CONFIGURED}`);
    expect(lint).toContain('  Effective config: unverified. Confirm it from the project root:\n    npx --no-install eslint --print-config src/App.tsx');
  });

  it('keeps the lint section beside the theme report', async () => {
    const { report } = await doctorJson(app('vite'), '--theme');
    expect(report.lint.state).toBe('not-configured');
    expect(report.diagnostics.some(({ ruleId }) => ruleId.startsWith('ULT-LINT'))).toBe(false);
  });
});
