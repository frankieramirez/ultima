import type { RecipeDescriptor } from '../schema.ts';

export default {
  id: 'sheet',
  kind: 'recipe',
  title: 'Sheet',
  description: 'A Dialog anchored to an edge of the viewport through style overrides.',
  contract: 'docs/spec/ultima.md#the-overlay-set',
  page: 'dialog',
  section: 'sheet',
  release: 'v0.2',
  demos: [
    'apps/docs/src/demos/dialog/sheet.tsx',
  ],
} satisfies RecipeDescriptor;
