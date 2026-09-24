import type { RecipeDescriptor } from '../schema.ts';

export default {
  id: 'item',
  kind: 'recipe',
  title: 'Item',
  description: 'A row inside a Card of media, a title and description, and trailing actions.',
  contract: 'docs/spec/ultima.md#item',
  page: 'card',
  section: 'item',
  release: 'v0.2',
  demos: [
    'apps/docs/src/demos/card/item.tsx',
  ],
} satisfies RecipeDescriptor;
