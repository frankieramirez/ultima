import type { RecipeDescriptor } from '../schema.ts';

export default {
  id: 'typography',
  kind: 'recipe',
  title: 'Typography',
  description: 'The prose mapping from headings, lists, and quotes to token styles and catalogue parts.',
  contract: 'docs/spec/ultima.md#typography',
  page: 'code',
  section: 'typography',
  release: 'v0.2',
  demos: [
    'apps/docs/src/demos/code/typography.tsx',
  ],
} satisfies RecipeDescriptor;
