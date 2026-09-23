import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../diagnostic.ts';
import { detectTarget } from '../doctor.ts';
import { run } from '../run.ts';
import { edit, editComponents, installed, project, smoke, snapshot } from './fixtures.ts';

type DoctorReport = { target: string | null; diagnostics: Diagnostic[]; unsupported: { step: string; reason: string }[] };

async function doctorJson(root: string, ...flags: string[]) {
  const before = snapshot(root);
  const result = await run(['doctor', '--json', '--cwd', root, ...flags]);
  expect(snapshot(root)).toEqual(before);
  return { code: result.code, report: JSON.parse(result.stdout) as DoctorReport };
}

describe('detectTarget', () => {
  it('finds Vite by ultima.vite.ts', async () => {
    expect(detectTarget(project({ 'ultima.vite.ts': '' }))).toBe('vite');
  });

  it('finds Next.js by app/ultima.css with babel.config.js', async () => {
    expect(detectTarget(project({ 'app/ultima.css': '', 'babel.config.js': '' }))).toBe('next');
  });

  it('finds Next.js by src/app/ultima.css with babel.config.js', async () => {
    expect(detectTarget(project({ 'src/app/ultima.css': '', 'babel.config.js': '' }))).toBe('next');
  });

  it('does not take ultima.css without babel.config.js for Next.js', async () => {
    expect(detectTarget(project({ 'app/ultima.css': '' }))).toBe('none');
  });

  it('reports none when no setup item was installed', async () => {
    expect(detectTarget(project())).toBe('none');
  });

  it('reports both when both setup items were installed', async () => {
    expect(detectTarget(installed('next', installed('vite')))).toBe('both');
  });
});

describe('ultima doctor', () => {
  it('passes the smoke-install Vite project and names the target', async () => {
    const { code, report } = await doctorJson(smoke('vite'));
    expect(report).toMatchObject({ command: 'doctor', target: 'vite', diagnostics: [] });
    expect(code).toBe(0);
  });

  it('passes the smoke-install Next.js project and names the target', async () => {
    const { code, report } = await doctorJson(smoke('next'));
    expect(report).toMatchObject({ command: 'doctor', target: 'next', diagnostics: [] });
    expect(code).toBe(0);
  });

  it('passes the production registry root', async () => {
    const root = smoke('vite');
    editComponents(root, (json) => {
      (json.registries as Record<string, unknown>)['@ultima'] = 'https://ultima.systems/r/{name}.json';
    });
    expect((await doctorJson(root)).code).toBe(0);
  });

  it('gives one blocking finding with the setup command as its repair when no target is installed', async () => {
    const { code, report } = await doctorJson(project());
    expect(report.target).toBeNull();
    expect(report.diagnostics).toHaveLength(1);
    expect(report.diagnostics[0]).toMatchObject({
      ruleId: 'ULT-SETUP-001',
      severity: 'blocking',
      file: '.',
    });
    expect(report.diagnostics[0]?.repair).toContain('npx shadcn add https://ultima.systems/r/setup-vite.json');
    expect(report.diagnostics[0]?.repair).toContain('npx shadcn add https://ultima.systems/r/setup-next.json');
    expect(code).toBe(1);
  });

  it('refuses to guess when both targets are installed', async () => {
    const result = await run(['doctor', '--cwd', installed('next', installed('vite'))]);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('--target');
  });

  it('takes --target in place of detection', async () => {
    const root = smoke('vite');
    writeFileSync(join(root, 'babel.config.js'), '');
    mkdirSync(join(root, 'app'));
    writeFileSync(join(root, 'app/ultima.css'), '');
    expect(detectTarget(root)).toBe('both');
    const { code, report } = await doctorJson(root, '--target', 'vite');
    expect(report.target).toBe('vite');
    expect(code).toBe(0);
  });

  it('reports a missing components.json as a blocking finding', async () => {
    const root = smoke('vite');
    rmSync(join(root, 'components.json'));
    const { code, report } = await doctorJson(root);
    expect(report.diagnostics).toEqual([
      expect.objectContaining({ ruleId: 'ULT-SETUP-002', severity: 'blocking', file: 'components.json' }),
    ]);
    expect(report.diagnostics[0]?.start).toBeUndefined();
    expect(code).toBe(1);
  });

  it('makes the run incomplete and names the file when components.json does not parse', async () => {
    const root = smoke('vite');
    writeFileSync(join(root, 'components.json'), '{ "style": "base-ultima", }');
    const result = await run(['doctor', '--cwd', root]);
    expect(result.code).toBe(3);
    expect(result.stdout).toContain('components.json');
    expect(result.stdout).toContain('ULT-SETUP-003');
  });

  it('lets a blocking finding outrank an incomplete run', async () => {
    const { code, report } = await doctorJson(project({ 'components.json': 'not json' }));
    expect(report.diagnostics.map((diagnostic) => diagnostic.severity).sort()).toEqual(['blocking', 'incomplete']);
    expect(code).toBe(1);
  });

  it('gives each components.json field violation its own finding with a repair', async () => {
    const root = smoke('vite');
    editComponents(root, (json) => {
      json.style = 'new-york';
      json.rsc = true;
      json.tailwind = { ...(json.tailwind as object), cssVariables: false };
      json.aliases = { ...(json.aliases as object), ui: '@/ui', lib: '~/lib' };
      json.registries = { '@ultima': 'https://example.com/components.json' };
    });
    const { code, report } = await doctorJson(root);
    expect(report.diagnostics.map((diagnostic) => diagnostic.ruleId)).toEqual([
      'ULT-SETUP-004',
      'ULT-SETUP-008',
      'ULT-SETUP-005',
      'ULT-SETUP-007',
      'ULT-SETUP-007',
      'ULT-SETUP-006',
    ]);
    for (const diagnostic of report.diagnostics) {
      expect(diagnostic).toMatchObject({ severity: 'blocking', file: 'components.json' });
      expect(diagnostic.repair).not.toBe('');
      expect(diagnostic.start).toBeDefined();
    }
    expect(code).toBe(1);
  });

  it('points a field finding at the field', async () => {
    const root = smoke('vite');
    editComponents(root, (json) => {
      json.style = 'new-york';
    });
    const { report } = await doctorJson(root);
    expect(report.diagnostics[0]).toMatchObject({
      ruleId: 'ULT-SETUP-004',
      start: { line: 3, column: 12 },
      end: { line: 3, column: 22 },
    });
  });

  it('reports a missing registry and missing aliases as findings', async () => {
    const root = smoke('vite');
    editComponents(root, (json) => {
      delete json.registries;
      delete json.aliases;
    });
    const { report } = await doctorJson(root);
    expect(report.diagnostics.map((diagnostic) => diagnostic.ruleId)).toEqual([
      'ULT-SETUP-006',
      'ULT-SETUP-007',
      'ULT-SETUP-007',
    ]);
  });

  it('prints text by default', async () => {
    const root = smoke('vite');
    editComponents(root, (json) => {
      json.style = 'new-york';
    });
    const result = await run(['doctor', '--cwd', root]);
    expect(result.stdout).toContain('Target: vite');
    expect(result.stdout).toContain('components.json:3:12  blocking  ULT-SETUP-004');
    expect(result.stdout).toContain('Repair: ');
    expect(result.stdout).toContain('docs/spec/ultima.md#setup-items');
  });
});

async function onlyFinding(root: string, ...flags: string[]) {
  const { code, report } = await doctorJson(root, ...flags);
  expect(report.diagnostics).toHaveLength(1);
  return { code, diagnostic: report.diagnostics[0] as Diagnostic };
}

function editJson(root: string, file: string, change: (json: Record<string, any>) => void) {
  edit(root, file, (text) => {
    const json = JSON.parse(text);
    change(json);
    return JSON.stringify(json);
  });
}

describe('the Vite hand steps', () => {
  it('finds tsconfig.json without the @/ paths alias', async () => {
    const root = smoke('vite');
    editJson(root, 'tsconfig.json', (json) => delete json.compilerOptions.paths);
    const { code, diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({ ruleId: 'ULT-SETUP-009', severity: 'blocking', file: 'tsconfig.json' });
    expect(diagnostic.message).toContain('tsconfig.json has no compilerOptions.paths, so no @/ alias');
    expect(diagnostic.repair).toBe('Add "paths": { "@/*": ["./src/*"] } under compilerOptions in tsconfig.json.');
    expect(code).toBe(1);
  });

  it('finds tsconfig.app.json without the @/ paths alias, and points at the paths it has', async () => {
    const root = smoke('vite');
    editJson(root, 'tsconfig.app.json', (json) => {
      json.compilerOptions.paths = { '~/*': ['./src/*'] };
    });
    const { diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({ ruleId: 'ULT-SETUP-009', file: 'tsconfig.app.json', start: { line: 1 } });
    expect(diagnostic.message).toContain('matches no compilerOptions.paths entry');
  });

  it('follows extends to the file that declares paths, and resolves against it', async () => {
    const root = smoke('vite');
    editJson(root, 'tsconfig.app.json', (json) => {
      delete json.compilerOptions.paths;
      json.extends = './config/tsconfig.paths.json';
    });
    mkdirSync(join(root, 'config'));
    writeFileSync(join(root, 'config/tsconfig.paths.json'), JSON.stringify({ compilerOptions: { paths: { '@/*': ['../src/*'] } } }));
    expect((await doctorJson(root)).code).toBe(0);
  });

  it('finds an alias that maps into a directory the project does not have', async () => {
    const root = smoke('vite');
    editJson(root, 'tsconfig.json', (json) => {
      json.compilerOptions.paths = { '@/*': ['./source/*'] };
    });
    const { diagnostic } = await onlyFinding(root);
    expect(diagnostic.message).toContain('maps into source/, which does not exist');
  });

  it('finds a literal ./@/ directory', async () => {
    const root = smoke('vite');
    mkdirSync(join(root, '@/components/ui'), { recursive: true });
    writeFileSync(join(root, '@/components/ui/button.tsx'), '');
    const { code, diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({ ruleId: 'ULT-SETUP-010', severity: 'blocking', file: '@' });
    expect(diagnostic.start).toBeUndefined();
    expect(diagnostic.repair).toContain('move the contents of ./@/');
    expect(code).toBe(1);
  });

  it('finds a setup dependency package.json does not declare', async () => {
    const root = smoke('vite');
    editJson(root, 'package.json', (json) => delete json.devDependencies.unplugin);
    const { diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({ ruleId: 'ULT-SETUP-011', file: 'package.json' });
    expect(diagnostic.start).toBeUndefined();
    expect(diagnostic.repair).toBe("Run `npm install -D unplugin`, or your package manager's equivalent.");
  });

  it('finds ultima.vite.ts missing', async () => {
    const root = smoke('vite');
    rmSync(join(root, 'ultima.vite.ts'));
    const { diagnostic } = await onlyFinding(root, '--target', 'vite');
    expect(diagnostic).toMatchObject({ ruleId: 'ULT-SETUP-012', file: 'ultima.vite.ts' });
    expect(diagnostic.repair).toBe('Run `npx shadcn add https://ultima.systems/r/setup-vite.json`; it installs ultima.vite.ts.');
  });

  it('finds ultimaStylex() after another plugin, at the plugins array', async () => {
    const root = smoke('vite');
    edit(root, 'vite.config.ts', (text) => text.replace('[ultimaStylex(), react()]', '[react(), ultimaStylex()]'));
    const { diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({
      ruleId: 'ULT-SETUP-013',
      file: 'vite.config.ts',
      start: { line: 7, column: 12 },
    });
    expect(diagnostic.repair).toBe('Move `ultimaStylex()` to the front: `plugins: [ultimaStylex(), …]`.');
  });

  it('finds vite.config.ts that never imports ultimaStylex', async () => {
    const root = smoke('vite');
    edit(root, 'vite.config.ts', (text) => text.replace("import { ultimaStylex } from './ultima.vite.ts'\n", ''));
    const { diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({ ruleId: 'ULT-SETUP-013', file: 'vite.config.ts' });
    expect(diagnostic.message).toBe("vite.config.ts does not import ultimaStylex from './ultima.vite'.");
  });

  it('follows a renamed import, a const config, and every return of a config function', async () => {
    const root = smoke('vite');
    writeFileSync(
      join(root, 'vite.config.ts'),
      [
        "import { defineConfig } from 'vite'",
        "import { ultimaStylex as stylex } from './ultima.vite'",
        "import react from '@vitejs/plugin-react'",
        '',
        'const plugins = [stylex(), react()]',
        '',
        'export default defineConfig(({ command }) => {',
        "  if (command === 'serve') return { plugins }",
        '  return { plugins: [react(), stylex()] }',
        '})',
        '',
      ].join('\n'),
    );
    const { diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({ ruleId: 'ULT-SETUP-013', start: { line: 9 } });
  });

  it('makes the run incomplete when plugins comes from a function call', async () => {
    const root = smoke('vite');
    edit(root, 'vite.config.ts', (text) => text.replace('[ultimaStylex(), react()]', 'plugins()'));
    const { code, diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({
      ruleId: 'ULT-ANALYSIS-001',
      severity: 'incomplete',
      file: 'vite.config.ts',
      start: { line: 7, column: 12 },
    });
    expect(code).toBe(3);
  });

  it('exits 1 with an unresolvable plugins and a blocking finding, and still lists the incomplete item', async () => {
    const root = smoke('vite');
    edit(root, 'vite.config.ts', (text) => text.replace('[ultimaStylex(), react()]', 'plugins()'));
    editJson(root, 'package.json', (json) => delete json.dependencies['@stylexjs/stylex']);
    const { code, report } = await doctorJson(root);
    expect(report.diagnostics.map((diagnostic) => diagnostic.ruleId).sort()).toEqual(['ULT-ANALYSIS-001', 'ULT-SETUP-011']);
    expect(code).toBe(1);
  });

  it('lists the CSP nonce and the steps it does not check yet as unsupported, never as a pass', async () => {
    const { report } = await doctorJson(smoke('vite'));
    expect(report.unsupported).toEqual([
      { step: expect.stringContaining('@layer'), reason: expect.stringContaining('does not check it yet') },
      { step: expect.stringContaining('CSPProvider'), reason: 'The headers are set at runtime or by the host.' },
      { step: expect.stringContaining('supported version'), reason: expect.stringContaining('does not check it yet') },
    ]);
    const text = (await run(['doctor', '--cwd', smoke('vite')])).stdout;
    expect(text).toContain('Unsupported analysis:');
    expect(text).toContain('No findings.');
  });
});

describe('the Next.js hand steps', () => {
  it('finds babel.config.js without the StyleX Babel plugin', async () => {
    const root = smoke('next');
    writeFileSync(join(root, 'babel.config.js'), "module.exports = { presets: ['next/babel'] };\n");
    const { code, diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({ ruleId: 'ULT-SETUP-014', severity: 'blocking', file: 'babel.config.js' });
    expect(diagnostic.message).toContain('does not reference @stylexjs/babel-plugin');
    expect(code).toBe(1);
  });

  it('finds postcss.config.js without the StyleX PostCSS plugin', async () => {
    const root = smoke('next');
    writeFileSync(join(root, 'postcss.config.js'), 'module.exports = { plugins: {} };\n');
    const { diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({ ruleId: 'ULT-SETUP-014', file: 'postcss.config.js' });
    expect(diagnostic.repair).toContain('--overwrite');
  });

  it('finds a layout that does not import ultima.css', async () => {
    const root = smoke('next');
    edit(root, 'app/layout.tsx', (text) => text.replace('import "./ultima.css";\n', ''));
    const { diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({ ruleId: 'ULT-SETUP-015', file: 'app/layout.tsx' });
    expect(diagnostic.repair).toBe("Add `import './ultima.css';` to app/layout.tsx.");
  });

  it('finds ultima.css outside the App Router directory that holds layout.tsx', async () => {
    const root = smoke('next');
    mkdirSync(join(root, 'src'));
    renameSync(join(root, 'app/layout.tsx'), join(root, 'src/app-layout.tsx'));
    mkdirSync(join(root, 'src/app'));
    renameSync(join(root, 'src/app-layout.tsx'), join(root, 'src/app/layout.tsx'));
    const { diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({ ruleId: 'ULT-SETUP-015', file: 'src/app/ultima.css' });
    expect(diagnostic.repair).toBe('Move ultima.css into src/app/.');
  });

  it('finds tsconfig.json without the @/ paths alias', async () => {
    const root = smoke('next');
    editJson(root, 'tsconfig.json', (json) => delete json.compilerOptions.paths);
    const { diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({ ruleId: 'ULT-SETUP-009', file: 'tsconfig.json' });
    expect(diagnostic.repair).toBe('Add "paths": { "@/*": ["./*"] } under compilerOptions in tsconfig.json.');
  });
});

describe('invocation', () => {
  it('rejects an unknown flag before anything runs', async () => {
    const result = await run(['doctor', '--bogus', '--cwd', project()]);
    expect(result).toMatchObject({ code: 2, stdout: '' });
    expect(result.stderr).toContain('--bogus');
  });

  it('rejects an unknown command', async () => {
    expect((await run(['doktor'])).code).toBe(2);
  });

  it('rejects a missing command', async () => {
    expect((await run([])).code).toBe(2);
  });

  it('rejects a target it does not know', async () => {
    expect((await run(['doctor', '--cwd', installed('vite'), '--target', 'remix'])).code).toBe(2);
  });

  it('rejects a --cwd without a package.json', async () => {
    const root = mkdtempSync(join(tmpdir(), 'ultima-cli-'));
    const result = await run(['doctor', '--cwd', root]);
    expect(result).toMatchObject({ code: 2, stdout: '' });
    expect(result.stderr).toContain('package.json');
  });

  it.each(['diff', 'check', 'install', 'uninstall'])('says %s is not available in this build', async (command) => {
    const result = await run([command]);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('not available in this build');
  });
});
