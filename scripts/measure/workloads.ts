/**
 * The fixed command workloads of Workloads and comparable coverage. Every argv here is
 * a command that exists at the baseline revision; a later candidate runs the same
 * definitions, and a changed definition bumps its version so old samples stop
 * comparing.
 */

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

export function workload(id: string): Workload {
  const found = WORKLOADS.find((item) => item.id === id);
  if (!found) throw new Error(`unknown workload ${id}; known: ${WORKLOADS.map((item) => item.id).join(', ')}`);
  return found;
}
