// docs/spec/ultima.md, Consumer CLI, Install and Skill. Writes only managed files, inside the repository root.
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

export type Planned = { file: string; action: 'write' | 'unchanged' | 'remove' | 'edited' | 'outside' };

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
  edited: ['skipped', '  edited since install; install --force replaces it'],
  outside: ['skipped', '  resolves outside the repository root'],
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
  if (command === 'uninstall' && files.length === 0) lines.push('', 'No managed skill found.');
  if (extra.devDependency === false) {
    lines.push('', '@ultima-systems/cli is not in devDependencies. Add it: npm install -D @ultima-systems/cli');
  }
  return `${lines.join('\n')}\n`;
}
