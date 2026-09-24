import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Diagnostic } from '@ultima/analysis/consumer';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { pathsFromPayload, renderHookOutput } from '../hook.ts';
import { HARNESSES, type Harness } from '../install.ts';
import { run } from '../run.ts';
import { analysisFixture, installCatalogue, project, smoke, write } from './fixtures.ts';

const here = dirname(fileURLToPath(import.meta.url));
const payload = (name: string) => JSON.parse(readFileSync(join(here, 'payloads', `${name}.json`), 'utf8'));

// One payload per harness and tool. Recorded on 2026-09-24 from Claude Code, Codex CLI and the
// Copilot CLI with a post-edit hook that saved its stdin, paths rewritten to /repo. Two could not
// be recorded here: cursor-write follows the Write tool's hook input in cursor-agent
// 2026.09.23-86fc751 ({ file_path, content }) with the documented common fields, since the CLI was
// not logged in, and copilot-apply_patch carries the patch as the string toolArgs the Copilot docs
// describe, since no model that calls apply_patch was available to the account. Codex CLI
// reported every edit as apply_patch, so it has no Edit or Write payload to keep.
const PAYLOADS: [Harness, string, string[]][] = [
  ['claude', 'claude-write', ['/repo/src/created.ts']],
  ['claude', 'claude-edit', ['/repo/src/existing.ts']],
  ['codex', 'codex-apply_patch-add', ['/repo/src/created.ts']],
  ['codex', 'codex-apply_patch-update', ['/repo/src/existing.ts']],
  ['cursor', 'cursor-write', ['/repo/src/created.ts']],
  ['copilot', 'copilot-create', ['/repo/src/created.ts']],
  ['copilot', 'copilot-edit', ['/repo/src/existing.ts']],
  ['copilot', 'copilot-apply_patch', ['/repo/src/created.ts', '/repo/src/existing.ts']],
];

/** A recorded payload for this harness, pointed at one file of `root`. */
function editOf(harness: Harness, root: string, file: string): unknown {
  const path = join(root, file);
  switch (harness) {
    case 'claude':
      return { ...payload('claude-edit'), cwd: root, tool_input: { ...payload('claude-edit').tool_input, file_path: path } };
    case 'codex':
      return { ...payload('codex-apply_patch-update'), cwd: root, tool_input: { command: `*** Begin Patch\n*** Update File: ${file}\n@@\n-a\n+b\n*** End Patch` } };
    case 'cursor':
      return { ...payload('cursor-write'), workspace_roots: [root], tool_input: { file_path: path, content: '' } };
    case 'copilot':
      return { ...payload('copilot-edit'), cwd: root, toolArgs: { ...payload('copilot-edit').toolArgs, path } };
  }
}

const CONTEXT: Record<Harness, (output: Record<string, unknown>) => unknown> = {
  claude: (output) => (output.hookSpecificOutput as Record<string, unknown>).additionalContext,
  codex: (output) => (output.hookSpecificOutput as Record<string, unknown>).additionalContext,
  cursor: (output) => output.additional_context,
  copilot: (output) => output.additionalContext,
};

// A raw hex (advisory) above a palette read (blocking), so the blocking line has to move up.
const MIXED = `import * as stylex from '@stylexjs/stylex';

import { mithril } from '@/lib/tokens.stylex';

const styles = stylex.create({
  hex: { color: '#ff0000' },
  banner: { backgroundColor: mithril.dark3 },
});

export const Banner = () => <div {...stylex.props(styles.hex, styles.banner)} />;
`;

function consumer(): string {
  const root = installCatalogue(smoke('vite'), { ui: 'src/components/ui', lib: 'src/lib' });
  write(root, 'src/Banner.tsx', MIXED);
  write(root, 'src/Palette.tsx', analysisFixture('app/palette.tsx'));
  write(root, 'src/Clean.tsx', 'export const Clean = () => <div />;\n');
  return root;
}

async function hook(harness: string, root: string, stdin: string) {
  return run(['hook', harness, '--cwd', root], stdin);
}

afterEach(() => {
  vi.doUnmock('../check.ts');
  vi.resetModules();
});

describe('pathsFromPayload', () => {
  it.each(PAYLOADS)('reads %s’s %s payload', (harness, name, paths) => {
    expect(pathsFromPayload(harness, payload(name))).toEqual(paths);
  });

  it('reads a Copilot toolArgs sent as a JSON string', () => {
    const edit = payload('copilot-edit');
    expect(pathsFromPayload('copilot', { ...edit, toolArgs: JSON.stringify(edit.toolArgs) })).toEqual(['/repo/src/existing.ts']);
  });

  it('finds nothing in a payload without a path', () => {
    for (const harness of HARNESSES) {
      expect(pathsFromPayload(harness, { tool_name: 'Bash', toolName: 'bash', tool_input: { command: 'ls' }, toolArgs: { command: 'ls' } })).toEqual([]);
      expect(pathsFromPayload(harness, null)).toEqual([]);
    }
  });
});

describe('renderHookOutput', () => {
  const finding = (index: number, severity: Diagnostic['severity']): Diagnostic => ({
    ruleId: severity === 'blocking' ? 'ULT-APP-PALETTE-001' : 'ULT-APP-PAINT-001',
    severity,
    file: 'src/Many.tsx',
    start: { line: index + 1, column: 3 },
    end: { line: index + 1, column: 9 },
    message: 'A long explanation of what went wrong. '.repeat(30),
    repair: 'Read a semantic token instead.',
    link: 'https://ultima.systems/tokens#color',
  });

  it('sends 20 lines of 30 findings plus a count of the rest, blocking first, under 10 KB', () => {
    const diagnostics = Array.from({ length: 30 }, (_, index) => finding(index, index % 3 === 2 ? 'blocking' : 'advisory'));
    for (const harness of HARNESSES) {
      const output = renderHookOutput(harness, diagnostics);
      const context = String(CONTEXT[harness](output as Record<string, unknown>));
      const lines = context.split('\n');
      expect(lines).toHaveLength(21);
      expect(lines.at(-1)).toBe('and 10 more');
      expect(lines.slice(0, 10).every((line) => line.startsWith('Fix before handing work back: ULT-APP-PALETTE-001'))).toBe(true);
      expect(lines.slice(10, 20).every((line) => line.startsWith('Advisory: ULT-APP-PAINT-001'))).toBe(true);
      expect(Buffer.byteLength(context)).toBeLessThan(10 * 1024);
      expect(Buffer.byteLength(JSON.stringify(output))).toBeLessThan(10 * 1024);
      expect(JSON.stringify(output)).not.toContain('decision');
    }
  });

  it('is null with no finding to send', () => {
    expect(renderHookOutput('claude', [])).toBeNull();
    expect(renderHookOutput('claude', [finding(0, 'incomplete')])).toBeNull();
  });
});

describe('hook', () => {
  let root: string;

  beforeAll(() => {
    root = consumer();
  });

  it.each(HARNESSES)('hands %s the findings in its context field, the blocking line first', async (harness) => {
    const { code, stdout, stderr } = await hook(harness, root, JSON.stringify(editOf(harness, root, 'src/Banner.tsx')));
    expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
    const lines = String(CONTEXT[harness](JSON.parse(stdout))).split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^Fix before handing work back: ULT-APP-PALETTE-001 src\/Banner\.tsx:7:\d+ .+ Repair: /);
    expect(lines[1]).toMatch(/^Advisory: ULT-APP-PAINT-001 src\/Banner\.tsx:6:\d+ /);
  });

  it('writes Claude Code and Codex output under hookSpecificOutput', async () => {
    const { stdout } = await hook('claude', root, JSON.stringify(editOf('claude', root, 'src/Palette.tsx')));
    expect(Object.keys(JSON.parse(stdout))).toEqual(['hookSpecificOutput']);
    expect(JSON.parse(stdout).hookSpecificOutput.hookEventName).toBe('PostToolUse');
  });

  it('prints nothing for a clean file, a file outside the scope, or a payload without a path', async () => {
    write(root, 'notes/readme.md', '# notes\n');
    for (const stdin of [
      editOf('claude', root, 'src/Clean.tsx'),
      editOf('claude', root, 'notes/readme.md'),
      editOf('claude', root, 'src/Gone.tsx'),
      { ...payload('claude-edit'), tool_input: {} },
    ]) {
      expect(await hook('claude', root, JSON.stringify(stdin))).toEqual({ code: 0, stdout: '', stderr: '' });
    }
  });

  it('prints nothing and exits 0 on malformed stdin or an unknown harness', async () => {
    for (const stdin of ['', 'not json', '{"tool_input":', '[]']) {
      expect(await hook('claude', root, stdin)).toEqual({ code: 0, stdout: '', stderr: '' });
    }
    expect(await hook('gemini', root, JSON.stringify(editOf('claude', root, 'src/Palette.tsx')))).toEqual({ code: 0, stdout: '', stderr: '' });
    expect(await run(['hook'], '{}')).toEqual({ code: 0, stdout: '', stderr: '' });
  });

  it('prints nothing and exits 0 without a components.json', async () => {
    const bare = project({ 'src/Palette.tsx': analysisFixture('app/palette.tsx') });
    expect(await hook('claude', bare, JSON.stringify(editOf('claude', bare, 'src/Palette.tsx')))).toEqual({ code: 0, stdout: '', stderr: '' });
    const unconfigured = consumer();
    rmSync(join(unconfigured, 'components.json'));
    expect(await hook('claude', unconfigured, JSON.stringify(editOf('claude', unconfigured, 'src/Palette.tsx')))).toEqual({
      code: 0,
      stdout: '',
      stderr: '',
    });
  });

  it('prints nothing and exits 0 when check throws', async () => {
    vi.doMock('../check.ts', () => ({
      check: () => {
        throw new Error('boom');
      },
    }));
    const { run: mocked } = await import('../run.ts');
    expect(await mocked(['hook', 'claude', '--cwd', root], JSON.stringify(editOf('claude', root, 'src/Palette.tsx')))).toEqual({
      code: 0,
      stdout: '',
      stderr: '',
    });
  });

  it('stays out of usage', async () => {
    const { stderr } = await run(['bogus']);
    expect(stderr).not.toContain('hook');
  });
});

describe('the installed Claude Code hook', () => {
  it('returns the finding for a recorded payload piped into its command', async () => {
    const app = consumer();
    expect((await run(['install', '--cwd', app, '--harness', 'claude'])).code).toBe(0);
    // What `npm install @ultima-systems/cli` leaves behind, so `npx --no-install` resolves the build.
    mkdirSync(join(app, 'node_modules/@ultima-systems'), { recursive: true });
    symlinkSync(join(here, '../..'), join(app, 'node_modules/@ultima-systems/cli'), 'dir');
    mkdirSync(join(app, 'node_modules/.bin'));
    symlinkSync('../@ultima-systems/cli/dist/cli.js', join(app, 'node_modules/.bin/ultima'));
    const settings = JSON.parse(readFileSync(join(app, '.claude/settings.json'), 'utf8'));
    const [{ command }] = settings.hooks.PostToolUse.find((entry: { matcher: string }) => entry.matcher === 'Edit|Write').hooks;
    const result = spawnSync('sh', ['-c', command], {
      cwd: app,
      env: { ...process.env, CLAUDE_PROJECT_DIR: app, npm_config_offline: 'true' },
      input: JSON.stringify(editOf('claude', app, 'src/Palette.tsx')),
      encoding: 'utf8',
      timeout: 30_000,
    });
    expect(result.status).toBe(0);
    const { additionalContext } = JSON.parse(result.stdout).hookSpecificOutput;
    expect(additionalContext).toMatch(/^Fix before handing work back: ULT-APP-PALETTE-001 src\/Palette\.tsx:7:/);
  });
});
