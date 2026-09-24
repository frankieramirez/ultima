import type { MDXComponents } from 'mdx/types';
import type { ComponentProps, ComponentType } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { Prose } from '../prose';

/** What `@mdx-js/rollup` hands `Prose` for a props table plus a paragraph. */
function PropsTable({ components }: { components?: MDXComponents }) {
  const P = (components?.p ?? 'p') as ComponentType<ComponentProps<'p'>>;
  const Code = (components?.code ?? 'code') as ComponentType<ComponentProps<'code'>>;
  const Table = (components?.table ?? 'table') as ComponentType<ComponentProps<'table'>>;
  const Th = (components?.th ?? 'th') as ComponentType<ComponentProps<'th'>>;
  const Td = (components?.td ?? 'td') as ComponentType<ComponentProps<'td'>>;
  return (
    <>
      <P>
        Set <Code>variant</Code> to choose a look.
      </P>
      <Table>
        <thead>
          <tr>
            <Th>Prop</Th>
            <Th>Default</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td>
              <Code>variant</Code>
            </Td>
            <Td>
              <Code>'accent'</Code>
            </Td>
          </tr>
        </tbody>
      </Table>
    </>
  );
}

test('inline code stays unbroken inside table cells and still wraps in paragraphs', async () => {
  const { container } = await render(
    <Prose Content={PropsTable} breadcrumb={[{ label: 'Documentation' }, { label: 'Test' }]} />,
  );

  for (const code of container.querySelectorAll('td code')) {
    expect(getComputedStyle(code).whiteSpace).toBe('nowrap');
  }
  const paragraphCode = container.querySelector('p code');
  expect(paragraphCode).not.toBeNull();
  expect(getComputedStyle(paragraphCode as Element).overflowWrap).toBe('anywhere');
});

function Fenced({ components }: { components?: MDXComponents }) {
  const Pre = (components?.pre ?? 'pre') as ComponentType<ComponentProps<'pre'>>;
  return (
    <Pre>
      <code className="language-bash">pnpm dlx shadcn@latest add @ultima/button</code>
    </Pre>
  );
}

test('a prose fence carries the site copy button', async () => {
  const screen = await render(
    <Prose Content={Fenced} breadcrumb={[{ label: 'Install' }]} />,
  );
  await expect.element(screen.getByRole('button', { name: 'Copy' })).toBeVisible();
});
