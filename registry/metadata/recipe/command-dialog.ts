import type { RecipeDescriptor } from '../schema.ts';

export default {
  id: 'command-dialog',
  kind: 'recipe',
  title: 'Command dialog',
  description: 'The inline Command lifted into a Dialog: the searchable command palette.',
  contract: 'docs/spec/ultima.md#the-command-set',
  page: 'command',
  section: 'command-dialog',
  release: 'v0.2',
  demos: [
    'apps/docs/src/demos/command/command-dialog.tsx',
  ],
} satisfies RecipeDescriptor;
