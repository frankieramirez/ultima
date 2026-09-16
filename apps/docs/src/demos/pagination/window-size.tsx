import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Pagination } from '@ultima/ui';

const windows = [
  { label: 'Default', options: {} },
  { label: 'siblingCount 2', options: { siblingCount: 2 } },
  { label: 'boundaryCount 2', options: { boundaryCount: 2 } },
];

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-4'],
  },
});

export default function WindowSize() {
  return (
    <div {...stylex.props(styles.stack)}>
      {windows.map(({ label, options }) => (
        <Pagination.Root key={label} aria-label={`${label} window`}>
          <Pagination.List>
            {Pagination.getPages({ page: 10, count: 20, ...options }).map((entry, index) =>
              entry.type === 'ellipsis' ? (
                <Pagination.Item key={`gap-${index}`}>
                  <Pagination.Ellipsis />
                </Pagination.Item>
              ) : (
                <Pagination.Item key={entry.page}>
                  <Pagination.Page href={`?page=${entry.page}`} current={entry.page === 10}>
                    {entry.page}
                  </Pagination.Page>
                </Pagination.Item>
              ),
            )}
          </Pagination.List>
        </Pagination.Root>
      ))}
    </div>
  );
}
