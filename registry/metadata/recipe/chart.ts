import type { RecipeDescriptor } from '../schema.ts';

export default {
  id: 'chart',
  kind: 'recipe',
  title: 'Chart',
  description: 'A bar chart drawn with d3 scales inside a Table-backed figure.',
  contract: 'docs/spec/ultima.md#chart',
  page: 'table',
  section: 'chart',
  release: 'v0.2',
  demos: [
    'apps/docs/src/demos/table/chart.tsx',
  ],
} satisfies RecipeDescriptor;
