import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../diagnostic.ts';
import { detectTarget } from '../doctor.ts';
import { run } from '../run.ts';
import { edit, editComponents, installed, project, smoke, snapshot, write } from './fixtures.ts';

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
    expect(((await doctorJson(root))).code).toBe(0);
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
    expect(((await doctorJson(root))).code).toBe(0);
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

  it('lists the CSP nonce as unsupported, never as a pass', async () => {
    const { report } = await doctorJson(smoke('vite'));
    expect(report.unsupported).toEqual([
      { step: expect.stringContaining('CSPProvider'), reason: 'The headers are set at runtime or by the host.' },
    ]);
    const text = ((await run(['doctor', '--cwd', smoke('vite')]))).stdout;
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

describe('layered resets', () => {
  it("blocks create-next-app's unlayered reset at its file and line", async () => {
    const root = smoke('next');
    writeFileSync(join(root, 'app/globals.css'), 'html,\nbody {\n  max-width: 100vw;\n}\n\n* {\n  padding: 0;\n}\n');
    const { code, diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({
      ruleId: 'ULT-SETUP-016',
      severity: 'blocking',
      file: 'app/globals.css',
      start: { line: 6, column: 1 },
    });
    expect(diagnostic.repair).toContain('@layer');
    expect(code).toBe(1);
  });

  it('passes the same rule inside @layer, and html, body, and :root outside one', async () => {
    const root = smoke('next');
    writeFileSync(
      join(root, 'app/globals.css'),
      [
        '@layer reset {',
        '  *, *::before, ::after { padding: 0; }',
        '  @media (min-width: 1px) { h1 { margin: 0; } }',
        '}',
        'html, body { max-width: 100vw; }',
        ':root { --foreground: #171717; }',
        'HTML::selection, .card p, a:hover, button[disabled], :where(ul) { color: red; }',
        '@keyframes spin { from { rotate: 0deg; } to { rotate: 360deg; } }',
        '.card { & p { margin: 0; } }',
      ].join('\n'),
    );
    expect(await doctorJson(root)).toMatchObject({ code: 0, report: { diagnostics: [] } });
  });

  it('finds every reset shape outside a layer, including one inside @media', async () => {
    const root = smoke('next');
    writeFileSync(
      join(root, 'app/globals.css'),
      '*::before, ::after { box-sizing: border-box; }\n@media (prefers-color-scheme: dark) {\n  h1, body { margin: 0; }\n}\n',
    );
    const { report } = await doctorJson(root);
    expect(report.diagnostics.map(({ start, message }) => [start?.line, message])).toEqual([
      [1, expect.stringContaining('`*::before`, `::after`')],
      [3, expect.stringContaining('`h1`')],
    ]);
  });

  it("reports a package stylesheet's reset at its import site, with layer(reset) as the repair", async () => {
    const root = smoke('next');
    write(root, 'node_modules/normalize.css/package.json', JSON.stringify({ name: 'normalize.css', style: 'normalize.css' }));
    write(root, 'node_modules/normalize.css/normalize.css', 'html { line-height: 1.15; }\nbody { margin: 0; }\nh1 { font-size: 2em; }\n');
    writeFileSync(join(root, 'app/globals.css'), '@import "normalize.css";\n@layer reset { * { padding: 0; } }\n');
    const { code, diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({ ruleId: 'ULT-SETUP-016', severity: 'blocking', file: 'app/globals.css', start: { line: 1 } });
    expect(diagnostic.message).toContain('node_modules/normalize.css/normalize.css');
    expect(diagnostic.repair).toBe('Import it into a layer: `@import "normalize.css" layer(reset);`.');
    expect(code).toBe(1);

    edit(root, 'app/globals.css', (text) => text.replace('"normalize.css";', '"normalize.css" layer(reset);'));
    expect((await doctorJson(root)).code).toBe(0);
  });

  it('reports a package stylesheet a module imports at that import', async () => {
    const root = smoke('vite');
    write(root, 'node_modules/modern-normalize/modern-normalize.css', '*, ::before, ::after { box-sizing: border-box; }\n');
    edit(root, 'src/main.tsx', (text) => `${text}import 'modern-normalize/modern-normalize.css'\n`);
    const { diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({ file: 'src/main.tsx', start: { line: 3, column: 1 } });
    expect(diagnostic.repair).toContain('`@import "modern-normalize/modern-normalize.css" layer(reset);`');
  });

  it('makes the run incomplete when a package stylesheet does not resolve', async () => {
    const root = smoke('vite');
    edit(root, 'src/main.tsx', (text) => `${text}import 'modern-normalize/modern-normalize.css'\n`);
    const { code, diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({ ruleId: 'ULT-ANALYSIS-001', severity: 'incomplete', file: 'src/main.tsx' });
    expect(code).toBe(3);
  });

  it('follows index.html, relative modules, @/ aliases, and CSS @import to every stylesheet', async () => {
    const root = smoke('vite');
    edit(root, 'index.html', (text) => `<link rel="stylesheet" href="/src/fonts.css">\n<style>\n  p { margin: 0; }\n</style>\n${text}`);
    writeFileSync(join(root, 'src/fonts.css'), 'img { display: block; }\n');
    edit(root, 'src/App.tsx', (text) => `import { Card } from '@/card';\nimport './App.css';\n${text}`);
    writeFileSync(join(root, 'src/App.css'), '@import "./base.css";\n');
    writeFileSync(join(root, 'src/base.css'), 'button { font: inherit; }\n');
    writeFileSync(join(root, 'src/card.tsx'), "import './card.css';\nexport function Card() {}\n");
    writeFileSync(join(root, 'src/card.css'), 'ul { list-style: none; }\n');
    const { report } = await doctorJson(root);
    expect(report.diagnostics.map(({ file, start }) => `${file}:${start?.line}:${start?.column}`).sort()).toEqual([
      'index.html:3:3',
      'src/base.css:1:1',
      'src/card.css:1:1',
      'src/fonts.css:1:1',
    ]);
  });
});

describe('versions', () => {
  it('blocks when @stylexjs/stylex and the compiler plugin resolve to different versions', async () => {
    const root = smoke('vite');
    installVersion(root, '@stylexjs/unplugin', '0.0.1');
    installVersion(root, '@stylexjs/stylex', '0.0.2');
    const { code, report } = await doctorJson(root);
    expect(report.diagnostics).toContainEqual(
      expect.objectContaining({
        ruleId: 'ULT-SETUP-017',
        severity: 'blocking',
        file: 'package.json',
        message: expect.stringContaining('@stylexjs/stylex 0.0.2 and @stylexjs/unplugin 0.0.1'),
      }),
    );
    expect(code).toBe(1);
  });

  it('advises, and exits 0, when both resolve to one version above the tested ceiling', async () => {
    const root = smoke('next');
    installVersion(root, '@stylexjs/stylex', '99.0.0');
    installVersion(root, '@stylexjs/babel-plugin', '99.0.0');
    const { code, report } = await doctorJson(root);
    expect(report.diagnostics).toEqual([
      expect.objectContaining({ ruleId: 'ULT-SETUP-017', severity: 'advisory', file: 'package.json', start: expect.anything() }),
      expect.objectContaining({ ruleId: 'ULT-SETUP-017', severity: 'advisory', file: 'package.json', start: expect.anything() }),
    ]);
    expect(report.diagnostics[0]?.message).toContain('99.0.0');
    expect(code).toBe(0);
  });

  it('blocks a version below the supported floor', async () => {
    const root = smoke('next');
    installVersion(root, '@stylexjs/stylex', '0.0.1');
    installVersion(root, '@stylexjs/babel-plugin', '0.0.1');
    const { code, report } = await doctorJson(root);
    expect(report.diagnostics.map(({ severity, message }) => [severity, message])).toEqual([
      ['blocking', expect.stringMatching(/^@stylexjs\/stylex resolves to 0\.0\.1, below the supported floor/)],
      ['blocking', expect.stringMatching(/^@stylexjs\/babel-plugin resolves to 0\.0\.1, below the supported floor/)],
    ]);
    expect(code).toBe(1);
  });

  it('reads the version a parent directory resolves, as a hoisted workspace install has it', async () => {
    const workspace = project();
    const root = smoke('vite');
    renameSync(join(root, 'node_modules'), join(workspace, 'node_modules'));
    renameSync(root, join(workspace, 'app'));
    expect((await doctorJson(join(workspace, 'app'))).code).toBe(0);
  });

  it('makes the run incomplete when a declared package does not resolve', async () => {
    const root = smoke('vite');
    rmSync(join(root, 'node_modules/@stylexjs/unplugin'), { recursive: true });
    const { code, diagnostic } = await onlyFinding(root);
    expect(diagnostic).toMatchObject({ ruleId: 'ULT-SETUP-017', severity: 'incomplete', file: 'package.json' });
    expect(diagnostic.message).toContain('@stylexjs/unplugin is declared but does not resolve');
    expect(code).toBe(3);
  });

  it("names Yarn Plug'n'Play when it keeps a declared package from resolving", async () => {
    const root = smoke('vite');
    rmSync(join(root, 'node_modules'), { recursive: true });
    writeFileSync(join(root, '.pnp.cjs'), '');
    const { code, report } = await doctorJson(root);
    expect(report.diagnostics).toHaveLength(2);
    expect(report.diagnostics[0]?.message).toContain("Yarn Plug'n'Play");
    expect(report.diagnostics[0]?.repair).toContain('nodeLinker: node-modules');
    expect(code).toBe(3);
  });

  it('checks @base-ui/react once package.json declares it', async () => {
    const root = smoke('vite');
    editJson(root, 'package.json', (json) => {
      json.dependencies['@base-ui/react'] = '^0.1.0';
    });
    installVersion(root, '@base-ui/react', '0.1.0');
    const { code, diagnostic } = await onlyFinding(root);
    expect(diagnostic.message).toMatch(/^@base-ui\/react resolves to 0\.1\.0, below the supported floor/);
    expect(code).toBe(1);
  });
});

function installVersion(root: string, name: string, version: string) {
  write(root, `node_modules/${name}/package.json`, JSON.stringify({ name, version }));
}

describe('invocation', () => {
  it('rejects an unknown flag before anything runs', async () => {
    const result = await run(['doctor', '--bogus', '--cwd', project()]);
    expect(result).toMatchObject({ code: 2, stdout: '' });
    expect(result.stderr).toContain('--bogus');
  });

  it('rejects an unknown command', async () => {
    expect(((await run(['doktor']))).code).toBe(2);
  });

  it('rejects a missing command', async () => {
    expect(((await run([]))).code).toBe(2);
  });

  it('rejects a target it does not know', async () => {
    expect(((await run(['doctor', '--cwd', installed('vite'), '--target', 'remix']))).code).toBe(2);
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
