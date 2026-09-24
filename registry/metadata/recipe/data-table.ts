import type { RecipeDescriptor } from '../schema.ts';

export default {
  id: 'data-table',
  kind: 'recipe',
  title: 'Data Table',
  description: 'Table with sorting, filtering, pagination, and row selection over TanStack Table.',
  contract: 'docs/spec/ultima.md#data-table',
  page: 'table',
  section: 'data-table',
  release: 'v0.2',
  demos: [
    'apps/docs/src/demos/table/data-table-sorting.tsx',
    'apps/docs/src/demos/table/data-table-row-selection.tsx',
    'apps/docs/src/demos/table/data-table-filtering.tsx',
    'apps/docs/src/demos/table/data-table-pagination.tsx',
  ],
} satisfies RecipeDescriptor;
