import type { RecipeDescriptor } from '../schema.ts';

export default {
  id: 'kbd',
  kind: 'recipe',
  title: 'Kbd',
  description: 'Code rendered as the user-input element.',
  contract: 'docs/spec/ultima.md#kbd',
  page: 'code',
  section: 'kbd',
  release: 'v0.2',
  demos: [
    'apps/docs/src/demos/code/kbd.tsx',
  ],
} satisfies RecipeDescriptor;
