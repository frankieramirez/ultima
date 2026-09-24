import type { ArchitectureException } from './src/exceptions.ts';

export default [
  {
    id: 'separator-relative-dialog',
    rule: 'ULT-IMPORT-001',
    path: 'packages/ui/src/separator.tsx',
    symbol: 'Dialog',
    target: './dialog',
    count: 1,
    reason: 'Fixture: an exactly matched site.',
    authority: 'docs/spec/ultima.md#one-file-per-component',
  },
] satisfies ArchitectureException[];
