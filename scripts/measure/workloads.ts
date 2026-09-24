/**
 * The fixed command workloads of Workloads and comparable coverage. Every argv here is
 * a command that exists at the baseline revision; a later candidate runs the same
 * definitions, and a changed definition bumps its version so old samples stop
 * comparing. NEW_WORKLOADS holds the commands the candidate added; they carry the
 * paths they require, and are reported as new coverage rather than compared.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type Phase = { id: string; argv: string[]; cwd: string };

export type Coverage = {
  executed: string[];
  omitted: string[];
  unsupported: string[];
};

export type Workload = {
  id: string;
  version: number;
  title: string;
  phases: Phase[];
  coverage: Coverage;
  /** Set when the baseline has no narrower plan than another workload's identical argv. */
  samplesFrom?: string;
  note?: string;
  /**
   * Paths the checkout must hold for the argv to exist. A workload with requirements is
   * new coverage: the baseline cannot run it, so it has no same-coverage comparison.
   */
  requires?: string[];
  /**
   * Set when the command runs in its own snapshot and never reads the caller's cached
   * outputs, so a warm series would repeat the cold one; only cold is measured.
   */
  cacheIndependent?: string;
  /** The baseline workload whose coverage this candidate-only workload widens or selects from. */
  comparesWith?: string;
};

/**
 * Application-cold clears these, and only these, before every cold sample. All are
 * gitignored build, Vite, Vitest, or generated outputs; installed dependencies and
 * browser binaries stay. OS page caches are not controlled.
 */
export const COLD_PATHS = [
  'node_modules/.vite',
  'apps/docs/node_modules/.vite',
  'packages/ui/node_modules/.vite',
  'packages/elements/node_modules/.vite',
  'packages/tokens/node_modules/.vite',
  'packages/cli/node_modules/.vite',
  'apps/docs/dist',
  'packages/tokens/dist',
  'packages/elements/dist',
  'packages/cli/dist',
  'registry/ultima',
  'registry/registry.json',
  'apps/docs/public/r/*.json',
  'apps/docs/public/tokens.css',
  'apps/docs/public/tokens.json',
  'apps/docs/public/llms.txt',
  'apps/docs/public/elements',
];

/** Retained in every condition and listed so a cold sample says what it did not clear. */
export const RETAINED = [
  'node_modules/ and every workspace node_modules/ (installed dependencies)',
  '~/.cache/ms-playwright (browser binaries)',
  '~/.npm and the pnpm store (package caches the smoke install and pnpm read)',
  'OS page cache (uncontrolled)',
];

const vitest = (filter: string, files: string[]): string[] => ['pnpm', '--filter', filter, 'exec', 'vitest', 'run', ...files];

const registryBuild: Phase = { id: 'registry-build', argv: ['pnpm', 'registry:build'], cwd: '.' };

/** The smoke install owns its TMPDIR through the runner, which sets it per sample. */
const smokeInstall: Phase = { id: 'smoke-install', argv: ['scripts/smoke-install.sh'], cwd: '.' };

const fullRelease: Phase[] = [
  { id: 'typecheck', argv: ['pnpm', 'typecheck'], cwd: '.' },
  { id: 'test', argv: ['pnpm', 'test'], cwd: '.' },
  { id: 'contrast', argv: ['python3', 'packages/tokens/scripts/palette.py', '--check'], cwd: '.' },
  registryBuild,
  { id: 'docs-build', argv: ['pnpm', '--filter', '@ultima/docs', 'build'], cwd: '.' },
  smokeInstall,
];

const fullReleaseCoverage: Coverage = {
  executed: [
    'CI check job in order: pnpm typecheck, pnpm test (every Vitest suite with the axe sweep, element parity and bundle budgets), palette.py --check, pnpm registry:build, docs production build',
    'Smoke install workflow: Vite and Next.js consumers from a local registry build, the whole registry:ui catalogue, setup items, the element item, doctor, status and diff',
  ],
  omitted: [],
  unsupported: [
    'Production browser scenarios (26-cell matrix): no production runner exists at this revision',
    'Remote CI status and branch protection: a local run cannot establish them',
  ],
};

export const WORKLOADS: Workload[] = [
  {
    id: 'dialog-edit',
    version: 1,
    title: 'Single React edit, Dialog pilot',
    phases: [
      { id: 'typecheck-ui', argv: ['pnpm', '--filter', '@ultima/ui', 'typecheck'], cwd: '.' },
      { id: 'test-dialog', argv: vitest('@ultima/ui', ['src/__tests__/dialog.test.tsx']), cwd: '.' },
    ],
    coverage: {
      executed: ['packages/ui typecheck', 'packages/ui/src/__tests__/dialog.test.tsx (proof bar, open-state axe)'],
      omitted: [
        'Components that import dialog.tsx (see inventory dependents) and their test files',
        'Docs demo axe sweep and the command-dialog recipe test in apps/docs',
        'Registry build and consumer install of the dialog item',
      ],
      unsupported: [
        'pnpm verify component dialog: the planned selector does not exist at this revision',
        'Production Dialog keyboard-dismissal cells: no production runner exists',
      ],
    },
  },
  {
    id: 'studio-history',
    version: 1,
    title: 'Studio draft/history edit',
    phases: [
      { id: 'typecheck-docs', argv: ['pnpm', '--filter', '@ultima/docs', 'typecheck'], cwd: '.' },
      registryBuild,
      {
        id: 'test-studio',
        argv: vitest('@ultima/docs', [
          'src/__tests__/theme-studio.test.tsx',
          'src/__tests__/theme-studio-export.test.tsx',
          'src/__tests__/theme-studio-parity.test.tsx',
        ]),
        cwd: '.',
      },
      {
        id: 'test-draft-model',
        argv: vitest('@ultima/tokens', [
          'src/__tests__/history.test.ts',
          'src/__tests__/autosave.test.ts',
          'src/__tests__/codec.test.ts',
          'src/__tests__/export.test.ts',
        ]),
        cwd: '.',
      },
    ],
    coverage: {
      executed: [
        'apps/docs typecheck',
        'pnpm registry:build (the docs test script runs it first)',
        'apps/docs theme-studio, theme-studio-export and theme-studio-parity suites (dev server, Chromium)',
        'packages/tokens history, autosave, codec and export suites (Node)',
      ],
      omitted: ['Remaining docs suites, including the axe sweep over demos', 'Consumer install'],
      unsupported: [
        'pnpm verify feature theme-studio: the planned selector does not exist at this revision',
        'Production Studio persistence/reset/undo cells: no production runner exists; the measurement-only observer in studio.ts times interactions but asserts no correctness',
      ],
    },
  },
  {
    id: 'token-edit',
    version: 1,
    title: 'Shared token edit',
    phases: fullRelease,
    samplesFrom: 'full-release',
    note: 'At this revision a shared token edit has no narrower supported plan than the full release: tokens feed every package, the contrast gate, elements and both consumers. Its argv is identical to full-release, so its samples are the full-release samples rather than a second identical batch.',
    coverage: fullReleaseCoverage,
  },
  {
    id: 'ult-button',
    version: 1,
    title: 'Element family edit, ult-button',
    phases: [
      { id: 'tokens-build', argv: ['pnpm', '--filter', '@ultima/tokens', 'build'], cwd: '.' },
      { id: 'elements-build', argv: ['pnpm', '--filter', '@ultima/elements', 'build'], cwd: '.' },
      {
        id: 'test-family',
        argv: vitest('@ultima/elements', [
          'src/__tests__/ult-button.test.ts',
          'src/__tests__/parity.test.ts',
          'src/__tests__/bundle.node.test.ts',
        ]),
        cwd: '.',
      },
      registryBuild,
      {
        id: 'test-fixture',
        argv: vitest('@ultima/docs', ['src/__tests__/elements.test.ts', 'src/__tests__/elements.test.tsx']),
        cwd: '.',
      },
    ],
    coverage: {
      executed: [
        'tokens and elements builds (bundle and gzip budget inputs)',
        'ult-button proof, React/element parity and bundle budget suites',
        'registry build staging the served bundle, then the docs fixture page suites (both modes, axe)',
      ],
      omitted: ['Other element families', 'The element item in the smoke install'],
      unsupported: ['pnpm verify component ult-button: the planned selector does not exist at this revision'],
    },
  },
  {
    id: 'setup-recipe',
    version: 1,
    title: 'Setup item and recipe',
    phases: [
      smokeInstall,
      registryBuild,
      {
        id: 'test-recipe',
        argv: vitest('@ultima/docs', ['src/__tests__/data-table.test.tsx', 'src/__tests__/axe.test.tsx']),
        cwd: '.',
      },
    ],
    coverage: {
      executed: [
        'Setup items: the smoke install is the only coverage for setup-vite and setup-next, and it cannot be narrowed below the whole catalogue',
        'Recipe (Data Table on the Table page): its demo suite and the axe sweep over every demo',
      ],
      omitted: ['The recipe engine is the consumer dependency; nothing installs it, by contract'],
      unsupported: ['A setup-only or recipe-only selector does not exist at this revision'],
    },
  },
  {
    id: 'full-release',
    version: 1,
    title: 'Full release',
    phases: fullRelease,
    coverage: fullReleaseCoverage,
  },
];

const verifyCli = ['scripts/verify.ts', 'scripts/verification/run.ts'];
const snapshotted =
  'pnpm verify runs in its own snapshot under .scratch/verify/<run-id>/ with its own install and outputs, so the caller checkout\'s retained build and Vite outputs are never read';

const plan = (id: string, title: string, selector: string[], comparesWith: string): Workload => ({
  id,
  version: 1,
  title,
  phases: [{ id: 'plan', argv: ['pnpm', 'verify', ...selector, '--plan', '--json'], cwd: '.' }],
  coverage: {
    executed: [`The ${selector.join(' ')} check plan: selection with reasons, prerequisites, locks and deadlines. It launches no check.`],
    omitted: ['Every check the plan names: a plan reports planned, never a pass'],
    unsupported: [],
  },
  requires: verifyCli,
  comparesWith,
});

const verifyRun = (id: string, title: string, selector: string[], comparesWith: string, executed: string[]): Workload => ({
  id,
  version: 1,
  title,
  phases: [{ id: 'verify', argv: ['pnpm', 'verify', ...selector, '--json'], cwd: '.' }],
  coverage: { executed, omitted: [], unsupported: ['Remote CI status and branch protection: a local run cannot establish them'] },
  requires: verifyCli,
  cacheIndependent: snapshotted,
  comparesWith,
});

/**
 * Candidate-only workloads: the planned selectors, discovery and new checks that the
 * contributor-tooling effort added. They are reported as new coverage and selected
 * scope, never folded into a same-coverage comparison.
 */
export const NEW_WORKLOADS: Workload[] = [
  {
    id: 'architecture',
    version: 1,
    title: 'Static architecture check',
    phases: [{ id: 'check-architecture', argv: ['pnpm', 'check:architecture'], cwd: '.' }],
    coverage: {
      executed: ['Source layout, import boundaries, primitive sources, token values, the styling engine, the public style-slot API and registry metadata, over the whole scope'],
      omitted: [],
      unsupported: [],
    },
    requires: ['scripts/check-architecture.ts'],
    comparesWith: 'full-release',
  },
  {
    id: 'catalogue-check',
    version: 1,
    title: 'Generated wiring freshness',
    phases: [{ id: 'catalogue-check', argv: ['pnpm', 'catalogue:check'], cwd: '.' }],
    coverage: {
      executed: ['Read-only freshness of the six generated projections and the feature map; dev, build, test, typecheck and registry:build run it first'],
      omitted: [],
      unsupported: [],
    },
    requires: ['scripts/catalogue/generate.ts'],
    comparesWith: 'full-release',
  },
  {
    id: 'discovery',
    version: 1,
    title: 'Discovery through list and describe for the three fixed prompts',
    phases: [
      { id: 'list-dialog', argv: ['pnpm', 'verify', 'list', '--search', 'Dialog Escape leaves focus behind', '--json'], cwd: '.' },
      { id: 'describe-dialog', argv: ['pnpm', 'verify', 'describe', 'scenario', 'dialog.keyboard-dismissal', '--json'], cwd: '.' },
      { id: 'list-reset', argv: ['pnpm', 'verify', 'list', '--search', 'Reset theme undo lost my override', '--json'], cwd: '.' },
      { id: 'describe-reset', argv: ['pnpm', 'verify', 'describe', 'scenario', 'theme-studio.draft-history', '--json'], cwd: '.' },
      { id: 'list-picker', argv: ['pnpm', 'verify', 'list', '--search', 'the picker broke', '--json'], cwd: '.' },
    ],
    coverage: {
      executed: ['Read-only discovery: owners, routes, bindings and scoped commands. It launches no app, browser or check.'],
      omitted: ['Running the discovered commands: scripts/measure/discover.ts proves they execute'],
      unsupported: [],
    },
    requires: verifyCli,
    comparesWith: 'dialog-edit',
  },
  plan('dialog-plan', 'Dialog component plan', ['component', 'dialog'], 'dialog-edit'),
  plan('studio-plan', 'Theme Studio feature plan', ['feature', 'theme-studio'], 'studio-history'),
  plan('ult-button-plan', 'ult-button component plan', ['component', 'ult-button'], 'ult-button'),
  plan('release-plan', 'Release plan', ['release'], 'full-release'),
  verifyRun('dialog-verify', 'Dialog component verification', ['component', 'dialog'], 'dialog-edit', [
    'Full architecture, freshness and typecheck',
    'The ui suites of Dialog and every file that imports it, the docs suites that render it, registry and docs builds, the full consumer smoke, and the Dialog production cells',
  ]),
  verifyRun('studio-verify', 'Theme Studio feature verification', ['feature', 'theme-studio'], 'studio-history', [
    'Full architecture, freshness and typecheck',
    'The Studio and draft-model suites, registry and docs builds, and the Theme Studio production cells',
  ]),
  verifyRun('release-verify', 'Release verification', ['release'], 'full-release', [
    'Full architecture, freshness and typecheck, every Vitest suite with the axe sweep, palette check, registry, token, element and docs builds',
    'The full Vite, Next.js and element consumer smoke, and the 26-cell production matrix',
  ]),
  {
    id: 'production-matrix',
    version: 1,
    title: 'Production scenario matrix',
    phases: [{ id: 'test-production', argv: ['pnpm', '--filter', '@ultima/docs', 'test:production', '--json'], cwd: '.' }],
    coverage: {
      executed: ['Every registered production case (26 cells) against its own production docs build, in its own verification run'],
      omitted: [],
      unsupported: [],
    },
    requires: ['apps/docs/tests/production'],
    cacheIndependent: snapshotted,
    comparesWith: 'full-release',
  },
];

/** Null when the checkout can run the workload, else why it cannot. */
export function unsupportedReason(root: string, target: Workload): string | null {
  const missing = (target.requires ?? []).filter((path) => !existsSync(join(root, path)));
  return missing.length === 0 ? null : `the command does not exist at this revision (missing ${missing.join(', ')})`;
}

export function workload(id: string): Workload {
  const all = [...WORKLOADS, ...NEW_WORKLOADS];
  const found = all.find((item) => item.id === id);
  if (!found) throw new Error(`unknown workload ${id}; known: ${all.map((item) => item.id).join(', ')}`);
  return found;
}
