import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'pagination',
  kind: 'react',
  title: 'Pagination',
  description: 'A page window with truncation, disabled ends, and a pure function that computes the window.',
  contract: 'docs/spec/ultima.md#the-navigation-set',
  installDocs: 'import { Pagination } from \'@/components/ui/pagination\';\n\n<Pagination.Root>\n  <Pagination.List>\n    <Pagination.Item>\n      <Pagination.Previous href="?page=1" disabled>Previous</Pagination.Previous>\n    </Pagination.Item>\n    {Pagination.getPages({ page, count }).map((entry, index) =>\n      entry.type === \'ellipsis\' ? (\n        <Pagination.Item key={`gap-${index}`}><Pagination.Ellipsis /></Pagination.Item>\n      ) : (\n        <Pagination.Item key={entry.page}>\n          <Pagination.Page href={`?page=${entry.page}`} current={entry.page === page}>{entry.page}</Pagination.Page>\n        </Pagination.Item>\n      ),\n    )}\n    <Pagination.Item>\n      <Pagination.Next href="?page=2">Next</Pagination.Next>\n    </Pagination.Item>\n  </Pagination.List>\n</Pagination.Root>\n\ngetPages is pure arithmetic and you render the result, so a page item can be your router\'s link. Root carries aria-label="Pagination" unless you name it yourself, and a second control on one page needs its own name. Do not render an Ultima Button into these parts: two Ultima styles collide rather than cascade.',
  primaryExport: 'Pagination',
  release: 'v0.2',
  order: 2,
} satisfies ReactDescriptor;
