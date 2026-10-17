import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Alert, Badge, Button, Card, Checkbox, Code, Dialog, Empty, Input, Popover, Separator, Table } from '@ultima/ui';
import { declaredValues } from './token-value';

// docs/spec/design-foundations.md#borders: an edge that only decorates is drawn at 0.5px, one device
// pixel on a high-density screen; an edge a person needs to find a control stays 1px.
const FINE = '0.5px';
const HAIRLINE = '1px';

// StyleX may write a logical side as its physical one, so a part is read on either name.
const SIDES: Record<string, string[]> = {
  'border-top-width': ['border-top-width'],
  'border-block-start-width': ['border-block-start-width', 'border-top-width'],
  'border-block-end-width': ['border-block-end-width', 'border-bottom-width'],
};

function width(element: Element, property = 'border-top-width'): string | undefined {
  return (SIDES[property] ?? [property]).flatMap((name) => declaredValues(element, name)).at(-1);
}

test('surfaces and dividers draw their decorative edge at 0.5px', async () => {
  const screen = await render(
    <>
      <Card.Root data-testid="card">
        <Card.Body>Body</Card.Body>
      </Card.Root>
      <Alert.Root data-testid="alert">
        <Alert.Title>Deploy paused</Alert.Title>
      </Alert.Root>
      <Badge data-testid="badge">
        beta
      </Badge>
      <Empty.Root data-testid="empty">
        <Empty.Title>No projects</Empty.Title>
      </Empty.Root>
      <Code data-testid="code" variant="block">
        pnpm test
      </Code>
      <Separator data-testid="separator" />
      <Table.Root>
        <Table.Head>
          <Table.Row>
            <Table.HeadCell data-testid="head">Name</Table.HeadCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell data-testid="cell">Ultima</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>
    </>,
  );
  for (const id of ['card', 'alert', 'badge', 'empty', 'code']) {
    expect(width(screen.getByTestId(id).element()), id).toBe(FINE);
  }
  expect(width(screen.getByTestId('separator').element(), 'border-block-start-width')).toBe(FINE);
  expect(width(screen.getByTestId('head').element(), 'border-block-end-width')).toBe(FINE);
  expect(width(screen.getByTestId('cell').element(), 'border-block-end-width')).toBe(FINE);
});

test('popups and dialogs float on a 0.5px edge', async () => {
  const screen = await render(
    <>
      <Popover.Root defaultOpen>
        <Popover.Trigger>Open popover</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup data-testid="popover">Popover</Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <Dialog.Root defaultOpen>
        <Dialog.Portal>
          <Dialog.Viewport>
            <Dialog.Popup data-testid="dialog">
              <Dialog.Title>Delete project?</Dialog.Title>
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
    </>,
  );
  await expect.element(screen.getByTestId('popover')).toBeVisible();
  expect(width(screen.getByTestId('popover').element())).toBe(FINE);
  expect(width(screen.getByTestId('dialog').element())).toBe(FINE);
});

test('an edge that finds a control stays 1px', async () => {
  const screen = await render(
    <>
      <Input aria-label="Name" data-testid="input" />
      <Checkbox.Root aria-label="Agree" data-testid="checkbox" />
      <Button data-testid="outline" variant="outline">
        Share
      </Button>
    </>,
  );
  for (const id of ['input', 'checkbox', 'outline']) {
    expect(width(screen.getByTestId(id).element()), id).toBe(HAIRLINE);
  }
});
