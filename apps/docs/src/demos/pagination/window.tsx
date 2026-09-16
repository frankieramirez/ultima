import { useState } from 'react';
import { Pagination } from '@ultima/ui';

const COUNT = 10;

export default function PageWindow() {
  const [page, setPage] = useState(4);

  return (
    <Pagination.Root>
      <Pagination.List>
        <Pagination.Item>
          <Pagination.Previous
            render={<button type="button" />}
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Pagination.Previous>
        </Pagination.Item>
        {Pagination.getPages({ page, count: COUNT }).map((entry, index) =>
          entry.type === 'ellipsis' ? (
            <Pagination.Item key={`gap-${index}`}>
              <Pagination.Ellipsis />
            </Pagination.Item>
          ) : (
            <Pagination.Item key={entry.page}>
              <Pagination.Page
                render={<button type="button" />}
                current={entry.page === page}
                onClick={() => setPage(entry.page)}
              >
                {entry.page}
              </Pagination.Page>
            </Pagination.Item>
          ),
        )}
        <Pagination.Item>
          <Pagination.Next
            render={<button type="button" />}
            disabled={page === COUNT}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.List>
    </Pagination.Root>
  );
}
