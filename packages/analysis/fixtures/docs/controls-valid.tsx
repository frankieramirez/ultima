// ULT-DOCS-002 must pass everything below: semantic markup, live regions, and native elements handed
// to an Ultima component through render, resolved through the barrel and through an item path.
import { Button, Pagination } from '@ultima/ui';
import { Accordion } from '@ultima/ui/accordion';

export function Page() {
  return (
    <main>
      <h1>Title</h1>
      <nav aria-label="Pages">
        <a href="/install">Install</a>
      </nav>
      <form action="/search">
        <label htmlFor="q">Search</label>
      </form>
      <table>
        <tbody>
          <tr>
            <td>Prose</td>
          </tr>
        </tbody>
      </table>
      <p role="status" aria-live="polite" />
      <div role="group" aria-label="Group" />
      <div tabIndex={-1} />
      <Button render={<a href="/" />} nativeButton={false}>
        Link
      </Button>
      <Pagination.Page render={<button type="button" />}>1</Pagination.Page>
      <Accordion.Trigger render={(props) => <button {...props} />}>Open</Accordion.Trigger>
    </main>
  );
}
