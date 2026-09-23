import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../diagnostic.ts';
import { detectTarget } from '../doctor.ts';
import { run } from '../run.ts';
import { editComponents, installed, project } from './fixtures.ts';

function doctorJson(root: string, ...flags: string[]) {
  const result = run(['doctor', '--json', '--cwd', root, ...flags]);
  return {
    code: result.code,
    report: JSON.parse(result.stdout) as { target: string | null; diagnostics: Diagnostic[] },
  };
}

describe('detectTarget', () => {
  it('finds Vite by ultima.vite.ts', () => {
    expect(detectTarget(project({ 'ultima.vite.ts': '' }))).toBe('vite');
  });

  it('finds Next.js by app/ultima.css with babel.config.js', () => {
    expect(detectTarget(project({ 'app/ultima.css': '', 'babel.config.js': '' }))).toBe('next');
  });

  it('finds Next.js by src/app/ultima.css with babel.config.js', () => {
    expect(detectTarget(project({ 'src/app/ultima.css': '', 'babel.config.js': '' }))).toBe('next');
  });

  it('does not take ultima.css without babel.config.js for Next.js', () => {
    expect(detectTarget(project({ 'app/ultima.css': '' }))).toBe('none');
  });

  it('reports none when no setup item was installed', () => {
    expect(detectTarget(project())).toBe('none');
  });

  it('reports both when both setup items were installed', () => {
    expect(detectTarget(installed('next', installed('vite')))).toBe('both');
  });
});

describe('ultima doctor', () => {
  it('passes a correct Vite install and names the target', () => {
    const { code, report } = doctorJson(installed('vite'));
    expect(report).toEqual({ command: 'doctor', target: 'vite', diagnostics: [] });
    expect(code).toBe(0);
  });

  it('passes a correct Next.js install and names the target', () => {
    const { code, report } = doctorJson(installed('next'));
    expect(report).toEqual({ command: 'doctor', target: 'next', diagnostics: [] });
    expect(code).toBe(0);
  });

  it('passes the production registry root', () => {
    const root = installed('vite');
    editComponents(root, (json) => {
      (json.registries as Record<string, unknown>)['@ultima'] = 'https://ultima.systems/r/{name}.json';
    });
    expect(doctorJson(root).code).toBe(0);
  });

  it('gives one blocking finding with the setup command as its repair when no target is installed', () => {
    const { code, report } = doctorJson(project());
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

  it('refuses to guess when both targets are installed', () => {
    const result = run(['doctor', '--cwd', installed('next', installed('vite'))]);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('--target');
  });

  it('takes --target in place of detection', () => {
    const { code, report } = doctorJson(installed('vite', installed('next')), '--target', 'vite');
    expect(report.target).toBe('vite');
    expect(code).toBe(0);
  });

  it('reports a missing components.json as a blocking finding', () => {
    const { code, report } = doctorJson(project({ 'ultima.vite.ts': '' }));
    expect(report.diagnostics).toEqual([
      expect.objectContaining({ ruleId: 'ULT-SETUP-002', severity: 'blocking', file: 'components.json' }),
    ]);
    expect(report.diagnostics[0]?.start).toBeUndefined();
    expect(code).toBe(1);
  });

  it('makes the run incomplete and names the file when components.json does not parse', () => {
    const root = project({ 'ultima.vite.ts': '', 'components.json': '{ "style": "base-ultima", }' });
    const result = run(['doctor', '--cwd', root]);
    expect(result.code).toBe(3);
    expect(result.stdout).toContain('components.json');
    expect(result.stdout).toContain('ULT-SETUP-003');
  });

  it('lets a blocking finding outrank an incomplete run', () => {
    const { code, report } = doctorJson(project({ 'components.json': 'not json' }));
    expect(report.diagnostics.map((diagnostic) => diagnostic.severity).sort()).toEqual(['blocking', 'incomplete']);
    expect(code).toBe(1);
  });

  it('gives each components.json field violation its own finding with a repair', () => {
    const root = installed('vite');
    editComponents(root, (json) => {
      json.style = 'new-york';
      json.rsc = true;
      json.tailwind = { ...(json.tailwind as object), cssVariables: false };
      json.aliases = { ...(json.aliases as object), ui: '@/ui', lib: '~/lib' };
      json.registries = { '@ultima': 'https://example.com/components.json' };
    });
    const { code, report } = doctorJson(root);
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

  it('points a field finding at the field', () => {
    const root = installed('vite');
    editComponents(root, (json) => {
      json.style = 'new-york';
    });
    const { report } = doctorJson(root);
    expect(report.diagnostics[0]).toMatchObject({
      ruleId: 'ULT-SETUP-004',
      start: { line: 3, column: 12 },
      end: { line: 3, column: 22 },
    });
  });

  it('reports a missing registry and missing aliases as findings', () => {
    const root = installed('vite');
    editComponents(root, (json) => {
      delete json.registries;
      delete json.aliases;
    });
    const { report } = doctorJson(root);
    expect(report.diagnostics.map((diagnostic) => diagnostic.ruleId)).toEqual([
      'ULT-SETUP-006',
      'ULT-SETUP-007',
      'ULT-SETUP-007',
    ]);
  });

  it('prints text by default', () => {
    const root = installed('vite');
    editComponents(root, (json) => {
      json.style = 'new-york';
    });
    const result = run(['doctor', '--cwd', root]);
    expect(result.stdout).toContain('Target: vite');
    expect(result.stdout).toContain('components.json:3:12  blocking  ULT-SETUP-004');
    expect(result.stdout).toContain('Repair: ');
    expect(result.stdout).toContain('docs/spec/ultima.md#setup-items');
  });
});

describe('invocation', () => {
  it('rejects an unknown flag before anything runs', () => {
    const result = run(['doctor', '--bogus', '--cwd', project()]);
    expect(result).toMatchObject({ code: 2, stdout: '' });
    expect(result.stderr).toContain('--bogus');
  });

  it('rejects an unknown command', () => {
    expect(run(['doktor']).code).toBe(2);
  });

  it('rejects a missing command', () => {
    expect(run([]).code).toBe(2);
  });

  it('rejects a target it does not know', () => {
    expect(run(['doctor', '--cwd', installed('vite'), '--target', 'remix']).code).toBe(2);
  });

  it('rejects a --cwd without a package.json', () => {
    const root = mkdtempSync(join(tmpdir(), 'ultima-cli-'));
    const result = run(['doctor', '--cwd', root]);
    expect(result).toMatchObject({ code: 2, stdout: '' });
    expect(result.stderr).toContain('package.json');
  });

  it.each(['status', 'diff', 'check', 'install', 'uninstall'])('says %s is not available in this build', (command) => {
    const result = run([command]);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('not available in this build');
  });
});
