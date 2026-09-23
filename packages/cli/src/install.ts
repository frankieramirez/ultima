// docs/spec/ultima.md, Consumer CLI, Install, Skill, and Hooks. Writes only managed files, inside the repository root.
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative } from 'node:path';

export type Harness = 'claude' | 'codex' | 'cursor' | 'copilot';
export const HARNESSES: Harness[] = ['claude', 'codex', 'cursor', 'copilot'];

const MARKERS: Record<Harness, string[]> = {
  claude: ['.claude'],
  codex: ['.codex'],
  cursor: ['.cursor'],
  copilot: ['.github/copilot-instructions.md', '.github/skills', '.github/hooks'],
};
const DESTINATIONS: Record<Harness, string> = {
  claude: '.claude/skills/ultima-systems',
  codex: '.agents/skills/ultima-systems',
  cursor: '.agents/skills/ultima-systems',
  copilot: '.agents/skills/ultima-systems',
};

const HOOK_FILES: Record<Harness, string> = {
  claude: '.claude/settings.json',
  codex: '.codex/hooks.json',
  cursor: '.cursor/hooks.json',
  copilot: '.github/hooks/ultima.json',
};
const HOOK_EVENTS: Record<Harness, string> = { claude: 'PostToolUse', codex: 'PostToolUse', cursor: 'postToolUse', copilot: 'postToolUse' };
const HOOK_MARKER = 'ultima-systems';

const packageRootFile = (path: string) => new URL(`../${path}`, import.meta.url);
const SKILL_SOURCE = packageRootFile('skill/ultima-systems/SKILL.md');
export const CLI_VERSION: string = JSON.parse(readFileSync(packageRootFile('package.json'), 'utf8')).version;

const STAMP = /^metadata:\n {2}ultima-systems: (\S+) sha256:([0-9a-f]{64})\n/m;

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** The skill with its stamp: a frontmatter `metadata` entry whose hash covers the file without it. */
export function skillStamp(content: string, version: string): string {
  const end = content.indexOf('\n---\n', 3) + 1;
  return `${content.slice(0, end)}metadata:\n  ultima-systems: ${version} sha256:${sha256(content)}\n${content.slice(end)}`;
}

export function readSkillStamp(text: string): { version: string; hash: string; content: string } | null {
  const match = STAMP.exec(text);
  if (!match) return null;
  const [entry, version, hash] = match as unknown as [string, string, string];
  return { version, hash, content: text.slice(0, match.index) + text.slice(match.index + entry.length) };
}

export type ManagedState = 'current' | 'stale' | 'edited';

function managedState(text: string): { state: ManagedState; version: string } | null {
  const stamp = readSkillStamp(text);
  if (!stamp) return null;
  const state = sha256(stamp.content) !== stamp.hash ? 'edited' : stamp.version === CLI_VERSION ? 'current' : 'stale';
  return { state, version: stamp.version };
}

export function detectHarnesses(root: string): Harness[] {
  return HARNESSES.filter((harness) => MARKERS[harness].some((marker) => existsSync(join(root, marker))));
}

/** The managed skills on disk, for `status`. An unstamped file is not managed. */
export function managedSkills(root: string): { file: string; state: ManagedState; version: string }[] {
  return [...new Set(Object.values(DESTINATIONS))].flatMap((destination) => {
    const file = join(root, destination, 'SKILL.md');
    const managed = existsSync(file) ? managedState(readFileSync(file, 'utf8')) : null;
    return managed ? [{ file: relative(root, file), ...managed }] : [];
  });
}

export type Planned = { file: string; action: 'write' | 'unchanged' | 'remove' | 'strip' | 'edited' | 'outside' | 'invalid' };

type Json = Record<string, unknown>;
type HookFile = Json & { hooks?: Record<string, unknown[]> };

export function hookEntry(harness: Harness): Json {
  const command = `npx --no-install @ultima-systems/cli hook ${harness}`;
  const guarded = `${command} 2>/dev/null || true`;
  switch (harness) {
    case 'claude':
      return { matcher: 'Edit|Write', hooks: [{ type: 'command', command: `cd "$CLAUDE_PROJECT_DIR" && ${guarded}`, timeout: 30 }] };
    case 'codex':
      return {
        matcher: 'Edit|Write|apply_patch',
        hooks: [
          {
            type: 'command',
            command: `cd "$(git rev-parse --show-toplevel)" && ${guarded}`,
            commandWindows: `(for /f "delims=" %r in ('git rev-parse --show-toplevel') do @cd /d "%r") & ${command} 2>NUL || exit /b 0`,
            timeout: 30,
          },
        ],
      };
    case 'cursor':
      return { command: guarded, matcher: 'Write', timeout: 30 };
    case 'copilot':
      return { type: 'command', matcher: 'edit|create|apply_patch', bash: guarded, powershell: `${command} 2>$null; exit 0`, cwd: '.', timeoutSec: 30 };
  }
}

const marked = (value: unknown) => JSON.stringify(value).includes(HOOK_MARKER);

/** The file without Ultima's entries, or null when nothing but a `version` and empty `hooks` would remain. */
export function stripHooks(file: HookFile): HookFile | null {
  const hooks = Object.fromEntries(
    Object.entries(file.hooks ?? {}).flatMap(([event, entries]) => {
      if (!marked(entries)) return [[event, entries]];
      const kept = entries.flatMap((entry) => {
        if (!marked(entry)) return [entry];
        const inner = (entry as Json).hooks;
        if (!Array.isArray(inner)) return [];
        const rest = inner.filter((hook) => !marked(hook));
        return rest.length > 0 ? [{ ...(entry as Json), hooks: rest }] : [];
      });
      return kept.length > 0 ? [[event, kept]] : [];
    }),
  );
  const stripped: HookFile = file.hooks === undefined ? { ...file } : { ...file, hooks };
  const empty = Object.keys(stripped).every((key) => key === 'version' || (key === 'hooks' && Object.keys(hooks).length === 0));
  return empty ? null : stripped;
}

/** The file with Ultima's entries replaced by one fresh entry for the harness, every other entry and key in place. */
export function mergeHooks(file: HookFile | null, harness: Harness): HookFile {
  const base = (file && stripHooks(file)) ?? (harness === 'cursor' || harness === 'copilot' ? { version: 1 } : {});
  const event = HOOK_EVENTS[harness];
  return { ...base, hooks: { ...base.hooks, [event]: [...(base.hooks?.[event] ?? []), hookEntry(harness)] } };
}

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);

const isHookFile = (json: unknown): json is HookFile =>
  isObject(json) && (json.hooks === undefined || (isObject(json.hooks) && Object.values(json.hooks).every(Array.isArray)));

function readHookFile(file: string): HookFile | null | 'invalid' {
  if (!existsSync(file)) return null;
  try {
    const json: unknown = JSON.parse(readFileSync(file, 'utf8'));
    return isHookFile(json) ? json : 'invalid';
  } catch {
    return 'invalid';
  }
}

const serialize = (json: unknown) => `${JSON.stringify(json, null, 2)}\n`;

function installHook(root: string, harness: Harness, dryRun: boolean): Planned {
  const file = join(root, HOOK_FILES[harness]);
  const planned = (action: Planned['action']) => ({ file: HOOK_FILES[harness], action });
  if (!resolvesInsideRoot(root, dirname(file))) return planned('outside');
  const current = readHookFile(file);
  if (current === 'invalid') return planned('invalid');
  const merged = mergeHooks(current, harness);
  if (current && JSON.stringify(current) === JSON.stringify(merged)) return planned('unchanged');
  if (!dryRun) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, serialize(merged));
  }
  return planned('write');
}

function uninstallHook(root: string, harness: Harness): Planned[] {
  const file = join(root, HOOK_FILES[harness]);
  const planned = (action: Planned['action']) => [{ file: HOOK_FILES[harness], action }];
  const current = readHookFile(file);
  if (current === null) return [];
  if (!resolvesInsideRoot(root, dirname(file))) return planned('outside');
  if (harness === 'copilot') {
    rmSync(file);
    return planned('remove');
  }
  if (current === 'invalid') return planned('invalid');
  if (!marked(current.hooks ?? {})) return [];
  const stripped = stripHooks(current);
  if (stripped === null) {
    rmSync(file);
    return planned('remove');
  }
  writeFileSync(file, serialize(stripped));
  return planned('strip');
}

export function install(root: string, options: { harnesses?: Harness[]; dryRun: boolean; force: boolean }) {
  const harnesses = options.harnesses ?? detectHarnesses(root);
  const skill = skillStamp(readFileSync(SKILL_SOURCE, 'utf8'), CLI_VERSION);
  const files = [...new Set(harnesses.map((harness) => DESTINATIONS[harness]))].map((destination): Planned => {
    const directory = join(root, destination);
    const file = join(directory, 'SKILL.md');
    const planned = (action: Planned['action']) => ({ file: relative(root, file), action });
    if (!resolvesInsideRoot(root, directory)) return planned('outside');
    if (holdsExactly(directory, skill)) return planned('unchanged');
    if (existsSync(file) && !options.force && (managedState(readFileSync(file, 'utf8'))?.state ?? 'edited') === 'edited') {
      return planned('edited');
    }
    if (!options.dryRun) {
      rmSync(directory, { recursive: true, force: true });
      mkdirSync(directory, { recursive: true });
      writeFileSync(file, skill);
    }
    return planned('write');
  });
  files.push(...harnesses.map((harness) => installHook(root, harness, options.dryRun)));
  const { devDependencies = {} } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  return { harnesses, dryRun: options.dryRun, files, devDependency: '@ultima-systems/cli' in devDependencies };
}

export function uninstall(root: string) {
  const files = [...new Set(Object.values(DESTINATIONS))].flatMap((destination): Planned[] => {
    const directory = join(root, destination);
    const file = join(directory, 'SKILL.md');
    const managed = existsSync(file) ? managedState(readFileSync(file, 'utf8')) : null;
    if (!managed) return [];
    const planned = (action: Planned['action']) => [{ file: relative(root, file), action }];
    if (!resolvesInsideRoot(root, directory)) return planned('outside');
    if (managed.state === 'edited') return planned('edited');
    rmSync(directory, { recursive: true, force: true });
    return planned('remove');
  });
  files.push(...HARNESSES.flatMap((harness) => uninstallHook(root, harness)));
  return { files };
}

function holdsExactly(directory: string, skill: string): boolean {
  const file = join(directory, 'SKILL.md');
  if (!existsSync(file) || lstatSync(directory).isSymbolicLink() || !lstatSync(file).isFile()) return false;
  return readdirSync(directory).join() === 'SKILL.md' && readFileSync(file, 'utf8') === skill;
}

function resolvesInsideRoot(root: string, path: string): boolean {
  let existing = path;
  while (!existsSync(existing)) existing = dirname(existing);
  const from = relative(realpathSync(root), realpathSync(existing));
  return !from.startsWith('..') && !isAbsolute(from);
}

const LABELS: Record<Planned['action'], [string, string]> = {
  write: ['wrote', ''],
  unchanged: ['unchanged', ''],
  remove: ['removed', ''],
  strip: ['stripped', '  Ultima\'s hook entries removed; the rest left in place'],
  edited: ['skipped', '  edited since install; install --force replaces it'],
  outside: ['skipped', '  resolves outside the repository root'],
  invalid: ['skipped', '  not valid JSON; fix it by hand, then run the command again'],
};

export function printPlan(
  command: string,
  { files, ...extra }: { files: Planned[]; harnesses?: Harness[]; dryRun?: boolean; devDependency?: boolean },
): string {
  const lines = [`ultima ${command}`];
  if (extra.harnesses?.length === 0) {
    lines.push('', `No harness detected, so nothing was written. Pass --harness ${HARNESSES.join('|')} to choose one.`);
  } else if (extra.harnesses) {
    lines.push(`Harnesses: ${extra.harnesses.join(', ')}`);
  }
  if (files.length > 0) lines.push('');
  for (const { file, action } of files) {
    const [label, note] = command === 'uninstall' && action === 'edited' ? ['skipped', '  edited since install; left in place'] : LABELS[action];
    const shown = extra.dryRun && (action === 'write' || action === 'remove') ? `would ${action}` : label;
    lines.push(`${shown.padEnd(13)}${file}${note}`);
  }
  if (command === 'uninstall' && files.length === 0) lines.push('', 'No managed skill or hook found.');
  if (extra.devDependency === false) {
    lines.push('', '@ultima-systems/cli is not in devDependencies. Add it: npm install -D @ultima-systems/cli');
  }
  return `${lines.join('\n')}\n`;
}
