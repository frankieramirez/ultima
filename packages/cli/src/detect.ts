// What `init` finds in an existing directory: docs/spec/consumer-setup.md, Supported layouts and compatibility.
// Detection reads files only. It names one application, framework, layout and package manager, or every
// conflict that stops automatic setup, each with the file and the repair.
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { parseJson } from './edits.ts';
import type { Manager } from './recipe.ts';

export type Framework = 'vite' | 'next';

export type Conflict = { file: string; message: string; repair: string };

export type Detection = {
  /** The canonical application root: the real path, symlinks resolved. */
  root: string;
  framework: Framework;
  /** `src` for Vite; `app` or `src/app` for Next, the active App Router directory. */
  layout: 'src' | 'app' | 'src/app';
  /** Where `@/*` points and fresh UI and shared source go, relative to the root: `src`, or `` for Next root. */
  sourceRoot: string;
  /** The entry that wires styles: `src/main.tsx`, or the Next root layout. */
  entry: string;
  /** The root and application tsconfigs that exist, root first. */
  tsconfigs: string[];
  manager: { name: Manager; source: 'lockfile' | 'packageManager' | 'option' | 'default'; lockfile: string | null; declared: string | null };
};

export type DetectOptions = { framework: string | null; packageManager: Manager | null };

const LOCKFILES: Record<string, string> = {
  'package-lock.json': 'npm',
  'npm-shrinkwrap.json': 'npm',
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
  'bun.lock': 'bun',
  'bun.lockb': 'bun',
};
const SUPPORTED_MANAGERS = ['npm', 'pnpm'];
const MANUAL = 'https://ultima.systems/install';

export function detect(directory: string, options: DetectOptions): { detection: Detection | null; conflicts: Conflict[] } {
  const conflicts: Conflict[] = [];
  const conflict = (file: string, message: string, repair: string) => conflicts.push({ file, message, repair });
  const root = realpathSync(directory);
  const has = (path: string) => existsSync(join(root, path));

  const manifest = has('package.json') ? parseJson('package.json', readFileSync(join(root, 'package.json'), 'utf8')) : null;
  if (!manifest) {
    conflict('package.json', has('package.json') ? 'package.json does not parse as a JSON object.' : `${root} has no package.json, so it is not an application init can set up.`, has('package.json') ? 'Repair package.json, then plan again.' : `Scaffold the application first, or create a new one with \`init <new-directory> --framework vite\`.`);
    return { detection: null, conflicts };
  }
  const pkg = manifest.value as { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; packageManager?: unknown; workspaces?: unknown };
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };

  const workspace = has('pnpm-workspace.yaml') || pkg.workspaces !== undefined ? root : enclosingWorkspace(dirname(root));
  if (workspace) {
    conflict(
      relative(root, workspace) ? join(relative(root, workspace), 'package.json') : 'package.json',
      `${root} ${workspace === root ? 'is' : 'sits inside'} the workspace at ${workspace}, and workspace-wide setup is not automated.`,
      `Follow the manual setup at ${MANUAL} for this application.`,
    );
  }

  // The package manager: lockfiles and the packageManager field must agree with each other and with --package-manager.
  const lockfiles = Object.keys(LOCKFILES).filter(has);
  const fromLock = [...new Set(lockfiles.map((file) => LOCKFILES[file] as string))];
  const field = typeof pkg.packageManager === 'string' ? (/^([a-z]+)@/.exec(pkg.packageManager)?.[1] ?? pkg.packageManager) : null;
  if (lockfiles.length > 1) {
    conflict(lockfiles.join(', '), `${lockfiles.join(' and ')} both exist, so the package manager is ambiguous.`, 'Delete the lockfile of the manager you no longer use, then plan again.');
  }
  if (field && fromLock.length === 1 && field !== fromLock[0]) {
    conflict('package.json', `packageManager names ${field}, but ${lockfiles[0]} belongs to ${fromLock[0]}.`, 'Make packageManager and the lockfile name one manager, then plan again.');
  }
  const detected = fromLock.length === 1 ? fromLock[0] : (field ?? null);
  if (options.packageManager && detected && options.packageManager !== detected) {
    conflict(lockfiles[0] ?? 'package.json', `--package-manager ${options.packageManager} disagrees with the project, which uses ${detected}.`, `Drop --package-manager, or pass --package-manager ${detected}. init does not convert a lockfile.`);
  }
  const name = (detected ?? options.packageManager ?? 'npm') as string;
  if (!SUPPORTED_MANAGERS.includes(name)) {
    conflict(lockfiles[0] ?? 'package.json', `The project uses ${name}, which init does not automate yet.`, `Follow the manual setup at ${MANUAL}.`);
  }
  if (has('.pnp.cjs') || has('.pnp.js')) conflict('.pnp.cjs', 'The project uses Plug\'n\'Play, which init does not automate.', `Follow the manual setup at ${MANUAL}.`);
  const manager: Detection['manager'] = {
    name: name as Manager,
    source: fromLock.length === 1 ? 'lockfile' : field ? 'packageManager' : options.packageManager ? 'option' : 'default',
    lockfile: lockfiles.length === 1 ? (lockfiles[0] as string) : null,
    declared: typeof pkg.packageManager === 'string' ? pkg.packageManager : null,
  };

  // The framework and its layout.
  const framework: Framework | null = 'next' in declared ? 'next' : 'vite' in declared ? 'vite' : null;
  if (!framework) {
    conflict('package.json', 'package.json declares neither next nor vite, so no supported application was found.', `Supported: Vite React TypeScript and Next App Router TypeScript. Anything else follows the manual setup at ${MANUAL}.`);
    return { detection: null, conflicts };
  }
  if (options.framework && options.framework !== framework) {
    conflict('package.json', `--framework ${options.framework} does not match the application, which is ${framework}.`, `Drop --framework, or pass --framework ${framework}. A plan cannot change the framework.`);
  }
  for (const required of ['react', 'react-dom', 'typescript']) {
    if (!(required in declared)) {
      conflict('package.json', `package.json does not declare ${required}.`, required === 'typescript' ? `JavaScript-only applications follow the manual setup at ${MANUAL}.` : `Install ${required}, then plan again.`);
    }
  }
  if (!has('tsconfig.json')) conflict('tsconfig.json', 'tsconfig.json does not exist.', `JavaScript-only applications follow the manual setup at ${MANUAL}.`);

  let layout: Detection['layout'];
  let entry: string;
  let tsconfigs = ['tsconfig.json'];
  if (framework === 'vite') {
    layout = 'src';
    entry = 'src/main.tsx';
    tsconfigs = ['tsconfig.json', 'tsconfig.app.json'].filter(has);
    const configs = ['vite.config.ts', 'vite.config.mts', 'vite.config.cts', 'vite.config.js', 'vite.config.mjs', 'vite.config.cjs'].filter(has);
    if (!configs.includes('vite.config.ts') || configs.length > 1) {
      conflict(configs[0] ?? 'vite.config.ts', configs.length === 0 ? 'vite.config.ts does not exist.' : `The Vite config is ${configs.join(' and ')}; init recognizes a single vite.config.ts.`, `Add ultimaStylex() by hand as ${MANUAL} describes.`);
    }
    for (const file of ['index.html', 'src/main.tsx']) {
      if (!has(file)) conflict(file, `${file} does not exist, so the application uses a custom source root.`, `Custom source roots follow the manual setup at ${MANUAL}.`);
    }
    if (!['@vitejs/plugin-react', '@vitejs/plugin-react-swc'].some((plugin) => plugin in declared)) {
      conflict('package.json', 'package.json declares no React plugin for Vite.', 'Install @vitejs/plugin-react and add react() to plugins, then plan again.');
    }
  } else {
    const rootApp = has('app');
    const srcApp = has('src/app');
    if (rootApp && srcApp) {
      conflict('app', 'Both app and src/app exist, so the active App Router layout is ambiguous.', 'Move everything into one of them and delete the other, then plan again.');
    }
    layout = srcApp && !rootApp ? 'src/app' : 'app';
    entry = `${layout}/layout.tsx`;
    if (!has(entry)) {
      const pages = has('pages') || has('src/pages');
      const javascript = ['layout.jsx', 'layout.js'].some((file) => has(`${layout}/${file}`));
      conflict(
        entry,
        pages && !rootApp && !srcApp ? 'The application uses the Pages Router, which init does not automate.' : javascript ? `${layout}/layout is JavaScript.` : `${entry} does not exist.`,
        `Follow the manual setup at ${MANUAL}.`,
      );
    }
  }

  return {
    detection: { root, framework, layout, sourceRoot: layout === 'app' ? '' : 'src', entry, tsconfigs, manager },
    conflicts,
  };
}

function enclosingWorkspace(directory: string): string | null {
  for (let current = directory; ; current = dirname(current)) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;
    try {
      if (JSON.parse(readFileSync(join(current, 'package.json'), 'utf8'))?.workspaces) return current;
    } catch {
      // No package.json here, or not one that names workspaces.
    }
    if (dirname(current) === current) return null;
  }
}

/** True when `path`, or the nearest part of it that exists, resolves outside `root` through a symlink. */
export function escapes(root: string, path: string): boolean {
  let current = resolve(root, path);
  for (;;) {
    try {
      lstatSync(current);
      break;
    } catch {
      current = dirname(current);
    }
  }
  const real = realpathSync(current);
  const inside = relative(root, real);
  return inside.startsWith(`..${sep}`) || inside === '..' || isAbsolute(inside);
}
