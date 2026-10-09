// Agent setup for `init`: docs/spec/consumer-setup.md, Finish state and checks. init hands the managed skill and hooks
// to `install`, with its detection and `--harness` override, and only when the Git root is the application root, since
// the managed hooks resolve that root before they run the CLI. Otherwise it writes no agent file and prints the step.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { Conflict } from './detect.ts';
import { DESTINATIONS, HARNESSES, HOOK_FILES, type Harness, detectHarnesses, install, readSkillStamp } from './install.ts';
import type { Manager, ManualStep } from './recipe.ts';

/** What `install` does to one file: `preserve` is a skill another installer owns, which install leaves alone. */
export type AgentFile = { file: string; action: 'create' | 'edit' | 'unchanged' | 'preserve' };

export type AgentPlan = {
  harnesses: Harness[];
  selection: 'explicit' | 'detected' | 'none';
  /** The repository root the managed hooks would resolve, or null outside a repository. */
  gitRoot: string | null;
  status: 'delegated' | 'skipped';
  reason: 'no-harness' | 'no-git' | 'nested' | null;
  files: AgentFile[];
  /** The pinned CLI's install, through the selected manager. */
  command: string;
};

/** How agent setup ended: `deferred` names its reason; `not run` means the run stopped before it. */
export type AgentResult = { status: 'installed' | 'deferred' | 'not run' | 'failed' } & Pick<AgentPlan, 'harnesses' | 'reason' | 'gitRoot' | 'files'>;

export function gitRoot(directory: string): string | null {
  let existing = directory;
  while (!existsSync(existing)) existing = dirname(existing);
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: existing, encoding: 'utf8' });
  if (result.status !== 0) return null;
  try {
    return realpathSync(result.stdout.trim());
  } catch {
    return null;
  }
}

export function installCommand(pm: Manager, harnesses: Harness[]): string {
  const flags = harnesses.length > 0 ? harnesses.map((harness) => `--harness ${harness}`).join(' ') : `--harness <${HARNESSES.join('|')}>`;
  return `${pm === 'npm' ? 'npm exec --no -- ultima' : 'pnpm exec ultima'} install ${flags}`;
}

/**
 * Agent setup for the application at `root`. A new project does not exist yet, so nothing is detected there and its Git
 * root is never its own. `read` records each file install would touch, so a plan goes stale when one changes.
 */
export function planAgents(
  root: string,
  options: { exists: boolean; harnesses: Harness[] | null; pm: Manager; read?: (path: string) => void },
): { agents: AgentPlan; conflicts: Conflict[] } {
  const harnesses = options.harnesses ?? (options.exists ? detectHarnesses(root) : []);
  const selection = options.harnesses ? 'explicit' : harnesses.length > 0 ? 'detected' : 'none';
  const repository = gitRoot(root);
  const nested = repository !== null && (!options.exists || repository !== root);
  const reason = nested ? 'nested' : harnesses.length === 0 ? 'no-harness' : repository === null ? 'no-git' : null;
  const agents: AgentPlan = { harnesses, selection, gitRoot: repository, status: reason ? 'skipped' : 'delegated', reason, files: [], command: installCommand(options.pm, harnesses) };
  const conflicts: Conflict[] = [];
  if (reason) return { agents, conflicts };

  for (const { file, action } of install(root, { harnesses, dryRun: true, force: false }).files) {
    options.read?.(file);
    const path = join(root, file);
    if (action === 'write') agents.files.push({ file, action: existsSync(path) ? 'edit' : 'create' });
    else if (action === 'unchanged') agents.files.push({ file, action });
    else if (action === 'edited' && readSkillStamp(readFileSync(path, 'utf8')) === null) agents.files.push({ file, action: 'preserve' });
    else if (action === 'edited') {
      conflicts.push({ file, message: `${file} is Ultima's managed skill, edited since install wrote it.`, repair: `Move your edits out of it and delete ${dirname(file)}, or pass --harness for the harnesses you want, then plan again. init never replaces an edited managed skill.` });
    } else if (action === 'invalid') {
      conflicts.push({ file, message: `${file} is not valid JSON, so install cannot merge Ultima's hook into it.`, repair: 'Repair the JSON by hand, then plan again. init and install never rewrite a hook file that does not parse.' });
    } else {
      conflicts.push({ file, message: `${file} resolves outside the application through a symlink.`, repair: 'Remove the symlink, then plan again.' });
    }
  }
  return { agents, conflicts };
}

/** Applies a delegated plan through `install`, failing when install did anything the plan did not show. */
export function applyAgents(root: string, agents: AgentPlan): string | null {
  const result = install(root, { harnesses: agents.harnesses, dryRun: false, force: false });
  const expected = (action: AgentFile['action']) => (action === 'create' || action === 'edit' ? 'write' : action === 'preserve' ? 'edited' : 'unchanged');
  const planned = new Map(agents.files.map(({ file, action }) => [file, expected(action)]));
  const differs = result.files.filter(({ file, action }) => planned.get(file) !== action);
  return differs.length > 0 ? `install ${differs.map(({ file, action }) => `${action === 'write' ? 'wrote' : `left ${action}`} ${file}`).join(', ')}, which the plan did not show` : null;
}

export function agentResult(agents: AgentPlan, status: 'installed' | 'not run' | 'failed'): AgentResult {
  return { status: agents.status === 'skipped' ? 'deferred' : status, harnesses: agents.harnesses, reason: agents.reason, gitRoot: agents.gitRoot, files: agents.files };
}

const agentFiles = (harnesses: Harness[]) => [...new Set(harnesses.flatMap((harness) => [`${DESTINATIONS[harness]}/SKILL.md`, HOOK_FILES[harness]]))];

/** The consumer's agent step, when init did not finish agent setup itself, or when a new hook awaits the harness's trust. */
export function agentStep(agents: AgentPlan, app: string): ManualStep | null {
  const dryRun = `\`${agents.command.replace(/ --harness <[^>]+>$/, ' --harness <name>')} --dry-run\``;
  const trust = 'then accept your harness\'s prompt to trust the hook, if it shows one';
  if (agents.status === 'delegated') {
    const hooks = agents.files.filter(({ file, action }) => (action === 'create' || action === 'edit') && Object.values(HOOK_FILES).includes(file));
    if (hooks.length === 0) return null;
    return { title: 'Trust the agent hook', required: false, file: hooks.map(({ file }) => file).join(', '), edit: 'Open your harness in this application and accept its prompt to trust the new hook, if it shows one. init cannot accept it for you.', verify: `${dryRun} reports every file unchanged, and an agent edit that breaks a consumer rule gets \`ultima check\` findings back in the same turn.` };
  }
  const files = agents.harnesses.length > 0 ? agentFiles(agents.harnesses).join(', ') : 'the skill and hook files `install --dry-run` lists';
  if (agents.reason === 'nested') {
    const repository = agents.gitRoot as string;
    const hooks = agents.harnesses.length > 0 ? agents.harnesses.map((harness) => join(repository, HOOK_FILES[harness])).join(', ') : `the harness hook file in ${repository}`;
    return {
      title: 'Agent setup',
      required: false,
      file: hooks,
      edit: `This application sits inside the Git repository at ${repository}, and Ultima's managed hooks run the CLI from the repository root, so init installed no agent files and this application is not agent-ready. Wire a post-edit hook there by hand that changes into ${app} before it runs \`npx --no-install ultima-design hook <harness>\`, and install the skill as https://ultima.systems/cli#other-skill-installers describes.`,
      verify: `An agent edit under ${app} that breaks a consumer rule gets \`ultima check\` findings back in the same turn.`,
    };
  }
  const gitInit = agents.gitRoot === null ? '`git init`, then ' : '';
  const why = agents.reason === 'no-git' ? 'Ultima\'s hooks run from the Git root and this application has no repository yet. init never creates one. ' : 'No harness was detected or selected. ';
  return { title: 'Agent setup', required: false, file: files, edit: `${why}When you want it: ${gitInit}\`${agents.command}\`.`, verify: `${dryRun} reports every file unchanged; ${trust}.` };
}

/** One line for the plan (no status) or the finish report. */
export function describeAgents(agents: AgentPlan | AgentResult, status?: AgentResult['status']): string {
  const names = agents.harnesses.join(', ');
  if (agents.reason === 'nested') return `not agent-ready${names ? ` for ${names}` : ''}: the application is nested in the Git repository at ${agents.gitRoot}`;
  if (agents.reason === 'no-harness') return 'skipped: no harness detected or selected';
  if (agents.reason === 'no-git') return `deferred for ${names}: the application has no Git repository`;
  const files = agents.files.map(({ file, action }) => `${file} ${action}`).join(', ');
  return `${status === undefined ? 'install' : status} for ${names}: ${files}`;
}
