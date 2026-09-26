import { existsSync, mkdirSync, readFileSync, statSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CLI_VERSION, detectHarnesses, readSkillStamp, skillStamp } from '../install.ts';
import { run } from '../run.ts';
import { edit, project, snapshot } from './fixtures.ts';

const CLAUDE = '.claude/skills/ultima-design/SKILL.md';
const AGENTS = '.agents/skills/ultima-design/SKILL.md';
const SOURCE = readFileSync(new URL('../../skill/ultima-design/SKILL.md', import.meta.url), 'utf8');

function withDirectories(...directories: string[]): string {
  const root = project();
  for (const directory of directories) mkdirSync(join(root, directory), { recursive: true });
  return root;
}

const read = (root: string, file: string) => readFileSync(join(root, file), 'utf8');

describe('the skill stamp', () => {
  it('is a frontmatter metadata entry whose hash covers the file without it', () => {
    const stamped = skillStamp(SOURCE, '1.2.3');
    const frontmatter = stamped.slice(0, stamped.indexOf('\n---\n', 3));
    expect(frontmatter).toMatch(/\nmetadata:\n {2}ultima-design: 1\.2\.3 sha256:[0-9a-f]{64}$/);
    expect(readSkillStamp(stamped)).toMatchObject({ version: '1.2.3', content: SOURCE });
  });

  it('reads nothing from an unstamped file', () => {
    expect(readSkillStamp(SOURCE)).toBeNull();
  });
});

describe('detectHarnesses', () => {
  it('finds each harness by its own marker', () => {
    expect(detectHarnesses(withDirectories('.claude', '.codex', '.cursor', '.github/hooks'))).toEqual(['claude', 'codex', 'cursor', 'copilot']);
    expect(detectHarnesses(project({ '.github/copilot-instructions.md': '' }))).toEqual(['copilot']);
    expect(detectHarnesses(withDirectories('.github/skills'))).toEqual(['copilot']);
  });

  it('reads nothing into .agents/skills/ alone', () => {
    expect(detectHarnesses(withDirectories('.agents/skills'))).toEqual([]);
  });
});

describe('install', () => {
  it('writes identical copies for each detected harness, and a second run writes nothing', async () => {
    const root = withDirectories('.claude', '.cursor');
    const first = await run(['install', '--cwd', root]);
    expect(first.code).toBe(0);
    expect(read(root, CLAUDE)).toBe(read(root, AGENTS));
    expect(read(root, CLAUDE)).toBe(skillStamp(SOURCE, CLI_VERSION));

    const mtimes = [CLAUDE, AGENTS].map((file) => statSync(join(root, file)).mtimeMs);
    const before = snapshot(root);
    const second = await run(['install', '--cwd', root]);
    expect(second.code).toBe(0);
    expect(second.stdout).toMatch(/unchanged {4}\.claude\/skills\/ultima-design\/SKILL\.md/);
    expect(snapshot(root)).toEqual(before);
    expect([CLAUDE, AGENTS].map((file) => statSync(join(root, file)).mtimeMs)).toEqual(mtimes);
  });

  it('skips an edited skill with a message, and --force replaces it', async () => {
    const root = withDirectories('.claude');
    await run(['install', '--cwd', root]);
    edit(root, CLAUDE, (text) => `${text}Our own line.\n`);
    const edited = read(root, CLAUDE);

    const skipped = await run(['install', '--cwd', root]);
    expect(skipped.code).toBe(0);
    expect(skipped.stdout).toContain(`skipped      ${CLAUDE}  edited since install; install --force replaces it`);
    expect(read(root, CLAUDE)).toBe(edited);

    await run(['install', '--cwd', root, '--force']);
    expect(read(root, CLAUDE)).toBe(skillStamp(SOURCE, CLI_VERSION));
  });

  it('replaces a skill another CLI version wrote, and the directory whole', async () => {
    const root = project({ [CLAUDE]: skillStamp(SOURCE, '0.0.0-old'), '.claude/skills/ultima-design/notes.md': 'stray\n' });
    await run(['install', '--cwd', root]);
    expect(read(root, CLAUDE)).toBe(skillStamp(SOURCE, CLI_VERSION));
    expect(existsSync(join(root, '.claude/skills/ultima-design/notes.md'))).toBe(false);
  });

  it('writes nothing and names --harness when no harness is detected', async () => {
    const root = withDirectories('.agents/skills');
    const before = snapshot(root);
    const result = await run(['install', '--cwd', root]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('--harness');
    expect(snapshot(root)).toEqual(before);
  });

  it('lets --harness replace detection', async () => {
    const root = withDirectories('.claude');
    await run(['install', '--cwd', root, '--harness', 'codex', '--harness', 'copilot']);
    expect(existsSync(join(root, AGENTS))).toBe(true);
    expect(existsSync(join(root, CLAUDE))).toBe(false);
  });

  it('prints the plan under --dry-run and writes nothing', async () => {
    const root = withDirectories('.claude');
    const before = snapshot(root);
    const result = await run(['install', '--cwd', root, '--dry-run']);
    expect(result.stdout).toContain(`would write  ${CLAUDE}`);
    expect(snapshot(root)).toEqual(before);
  });

  it('writes a real copy through no symlink that leaves the repository root', async () => {
    const outside = join(project(), 'elsewhere');
    mkdirSync(outside);
    const root = project();
    symlinkSync(outside, join(root, '.claude'));
    const result = await run(['install', '--cwd', root]);
    expect(result.stdout).toContain(`skipped      ${CLAUDE}  resolves outside the repository root`);
    expect(snapshot(outside)).toEqual({});
  });

  it('prints the one command that adds the CLI when it is not a devDependency, and edits no package.json', async () => {
    const root = withDirectories('.claude');
    const bare = await run(['install', '--cwd', root]);
    expect(bare.stdout).toContain('npm install -D ultima-design');
    expect(read(root, 'package.json')).toBe('{}');

    const pinned = project({ 'package.json': JSON.stringify({ devDependencies: { 'ultima-design': '0.1.0' } }) });
    mkdirSync(join(pinned, '.claude'));
    expect((await run(['install', '--cwd', pinned])).stdout).not.toContain('npm install');
  });

  it('exits 2 on an unknown harness or a flag another command owns', async () => {
    expect((await run(['install', '--cwd', project(), '--harness', 'vim'])).code).toBe(2);
    expect((await run(['install', '--cwd', project(), '--target', 'vite'])).code).toBe(2);
    expect((await run(['uninstall', '--cwd', project(), '--force'])).code).toBe(2);
  });
});

describe('uninstall', () => {
  it('removes the skills whose stamps match and leaves an edited one with a message', async () => {
    const root = withDirectories('.claude', '.codex');
    await run(['install', '--cwd', root]);
    edit(root, AGENTS, (text) => `${text}Our own line.\n`);

    const result = await run(['uninstall', '--cwd', root]);
    expect(result.code).toBe(0);
    expect(existsSync(join(root, '.claude/skills/ultima-design'))).toBe(false);
    expect(existsSync(join(root, AGENTS))).toBe(true);
    expect(result.stdout).toContain(`removed      ${CLAUDE}`);
    expect(result.stdout).toContain(`skipped      ${AGENTS}  edited since install; left in place`);
  });

  it('leaves an unstamped skill alone', async () => {
    const root = project({ [CLAUDE]: SOURCE });
    const result = await run(['uninstall', '--cwd', root]);
    expect(read(root, CLAUDE)).toBe(SOURCE);
    expect(result.stdout).toContain('No managed skill or hook found.');
  });
});
