import type { ArchitectureException } from './src/exceptions.ts';

const all = (rule: string) => ({ id: 'everything', rule, path: 'packages/ui/src', symbol: '*', target: '*', count: 1, reason: '', authority: '' });

export default [all('ULT-IMPORT-001')] satisfies ArchitectureException[];
