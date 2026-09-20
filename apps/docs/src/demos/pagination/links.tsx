import * as stylex from '@stylexjs/stylex';
import { Pagination } from '@ultima/ui';

const styles = stylex.create({
  list: { flexWrap: 'wrap' },
});

export default function LinkedPages({ page = 1, count = 24 }: { page?: number; count?: number }) {
  return (
    <Pagination.Root aria-label="Search results pages">
      <Pagination.List style={styles.list}>
        <Pagination.Item>
          <Pagination.Previous href={`?page=${Math.max(page - 1, 1)}`} disabled={page === 1}>
            Previous
          </Pagination.Previous>
        </Pagination.Item>
        {Pagination.getPages({ page, count }).map((entry, index) =>
          entry.type === 'ellipsis' ? (
            <Pagination.Item key={`gap-${index}`}>
              <Pagination.Ellipsis />
            </Pagination.Item>
          ) : (
            <Pagination.Item key={entry.page}>
              <Pagination.Page href={`?page=${entry.page}`} current={entry.page === page}>
                {entry.page}
              </Pagination.Page>
            </Pagination.Item>
          ),
        )}
        <Pagination.Item>
          <Pagination.Next href={`?page=${Math.min(page + 1, count)}`} disabled={page === count}>
            Next
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.List>
    </Pagination.Root>
  );
}
