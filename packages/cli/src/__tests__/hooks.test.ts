import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { HARNESSES, type Harness, hookEntry } from '../install.ts';
import { run } from '../run.ts';
import { project, snapshot } from './fixtures.ts';

const FILES: Record<Harness, string> = {
  claude: '.claude/settings.json',
  codex: '.codex/hooks.json',
  cursor: '.cursor/hooks.json',
  copilot: '.github/hooks/ultima.json',
};

const FOREIGN: Record<Harness, object> = {
  claude: {
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
    permissions: { allow: ['Bash(ls)'] },
    hooks: {
      PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'prettier --write' }] }],
      Stop: [{ hooks: [{ type: 'command', command: 'say done' }] }],
    },
  },
  codex: { hooks: { PostToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'lint', timeout: 5 }] }] } },
  cursor: { version: 1, hooks: { postToolUse: [{ command: 'fmt', matcher: 'Write' }], stop: [{ command: 'notify' }] } },
  copilot: { version: 1, hooks: { preToolUse: [{ type: 'command', bash: 'audit', timeoutSec: 10 }] } },
};

const serialize = (json: unknown) => `${JSON.stringify(json, null, 2)}\n`;
const readJson = (root: string, file: string) => JSON.parse(readFileSync(join(root, file), 'utf8'));
const markedIn = (entries: unknown[]) => entries.filter((entry) => JSON.stringify(entry).includes('ultima-systems'));

describe('hookEntry', () => {
  it('runs the pinned CLI, guarded, with a 30-second timeout in each harness field', () => {
    for (const harness of HARNESSES) {
      const text = JSON.stringify(hookEntry(harness));
      expect(text).toContain(`npx --no-install @ultima-systems/cli hook ${harness} 2>/dev/null || true`);
      expect(text).toMatch(/"(timeout|timeoutSec)":30/);
    }
    expect(hookEntry('codex').hooks).toEqual([expect.objectContaining({ commandWindows: expect.stringContaining('hook codex') })]);
    expect(hookEntry('copilot')).toMatchObject({ powershell: expect.stringContaining('hook copilot'), cwd: '.' });
  });

  it('is identical whatever CLI version writes it', async () => {
    const written = async (version: string) => {
      vi.resetModules();
      vi.doMock('node:fs', async (original) => {
        const fs = await original<typeof import('node:fs')>();
        const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...rest: unknown[]) =>
          String(path).endsWith('cli/package.json')
            ? JSON.stringify({ version })
            : (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...rest)) as typeof fs.readFileSync;
        return { ...fs, readFileSync, default: { ...fs, readFileSync } };
      });
      const { CLI_VERSION, install } = await import('../install.ts');
      expect(CLI_VERSION).toBe(version);
      const root = project();
      install(root, { harnesses: HARNESSES, dryRun: false, force: false });
      return Object.values(FILES).map((file) => readFileSync(join(root, file), 'utf8'));
    };
    expect(await written('1.0.0')).toEqual(await written('2.3.4'));
  });

  afterEach(() => {
    vi.doUnmock('node:fs');
    vi.resetModules();
  });
});

describe('install hooks', () => {
  it.each(HARNESSES)('%s: keeps every foreign entry and key, adds one marked entry, and a re-run writes nothing', async (harness) => {
    const file = FILES[harness];
    const foreign = FOREIGN[harness];
    const root = project({ [file]: serialize(foreign) });

    expect((await run(['install', '--cwd', root, '--harness', harness])).code).toBe(0);
    const merged = readJson(root, file);
    const event = harness === 'claude' || harness === 'codex' ? 'PostToolUse' : 'postToolUse';
    expect(markedIn(Object.values(merged.hooks).flat() as unknown[])).toEqual([hookEntry(harness)]);
    expect(merged.hooks[event].at(-1)).toEqual(hookEntry(harness));
    merged.hooks[event].pop();
    if (merged.hooks[event].length === 0) delete merged.hooks[event];
    expect(merged).toEqual(foreign);

    const bytes = readFileSync(join(root, file), 'utf8');
    const mtime = statSync(join(root, file)).mtimeMs;
    const second = await run(['install', '--cwd', root, '--harness', harness]);
    expect(second.stdout).toContain(`unchanged    ${file}`);
    expect(readFileSync(join(root, file), 'utf8')).toBe(bytes);
    expect(statSync(join(root, file)).mtimeMs).toBe(mtime);
  });

  it('replaces an older marked entry rather than adding a second', async () => {
    const stale = { hooks: { PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'npx @ultima-systems/cli hook claude' }] }] } };
    const root = project({ [FILES.claude]: serialize(stale) });
    await run(['install', '--cwd', root, '--harness', 'claude']);
    expect(readJson(root, FILES.claude)).toEqual({ hooks: { PostToolUse: [hookEntry('claude')] } });
  });

  it('never writes settings.local.json', async () => {
    const root = project();
    mkdirSync(join(root, '.claude'));
    await run(['install', '--cwd', root]);
    expect(existsSync(join(root, '.claude/settings.json'))).toBe(true);
    expect(existsSync(join(root, '.claude/settings.local.json'))).toBe(false);
  });

  it('names a hook file that is not valid JSON, leaves it untouched, and exits 3, even with --force', async () => {
    const root = project({ [FILES.claude]: '{ "hooks": ' });
    for (const argv of [['install', '--cwd', root], ['install', '--cwd', root, '--force']]) {
      const result = await run(argv);
      expect(result.code).toBe(3);
      expect(result.stdout).toContain(`skipped      ${FILES.claude}  not valid JSON`);
      expect(readFileSync(join(root, FILES.claude), 'utf8')).toBe('{ "hooks": ');
    }
  });

  it('includes the hook plan under --dry-run and writes nothing', async () => {
    const root = project();
    mkdirSync(join(root, '.cursor'));
    const before = snapshot(root);
    const result = await run(['install', '--cwd', root, '--dry-run']);
    expect(result.stdout).toContain(`would write  ${FILES.cursor}`);
    expect(snapshot(root)).toEqual(before);
  });
});

describe('uninstall hooks', () => {
  it.each(HARNESSES.filter((harness) => harness !== 'copilot'))('%s: restores the pre-install content of a merged file', async (harness) => {
    const file = FILES[harness];
    const root = project({ [file]: serialize(FOREIGN[harness]) });
    await run(['install', '--cwd', root, '--harness', harness]);

    const result = await run(['uninstall', '--cwd', root]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`stripped     ${file}`);
    expect(readFileSync(join(root, file), 'utf8')).toBe(serialize(FOREIGN[harness]));
  });

  it('removes every hook file Ultima alone populated, and .github/hooks/ultima.json whole', async () => {
    const root = project({ [FILES.copilot]: serialize(FOREIGN.copilot) });
    await run(['install', '--cwd', root, '--harness', 'claude', '--harness', 'codex', '--harness', 'cursor', '--harness', 'copilot']);

    const result = await run(['uninstall', '--cwd', root]);
    for (const file of Object.values(FILES)) {
      expect(existsSync(join(root, file))).toBe(false);
      expect(result.stdout).toContain(`removed      ${file}`);
    }
  });

  it('leaves a hook file without Ultima entries alone', async () => {
    const root = project({ [FILES.codex]: serialize(FOREIGN.codex) });
    const result = await run(['uninstall', '--cwd', root]);
    expect(readFileSync(join(root, FILES.codex), 'utf8')).toBe(serialize(FOREIGN.codex));
    expect(result.stdout).toContain('No managed skill or hook found.');
  });
});
