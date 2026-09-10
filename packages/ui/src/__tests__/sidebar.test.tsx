import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import * as stylex from '@stylexjs/stylex';
import { Button, Collapsible, Sidebar, useSidebar, type SidebarPanelProps } from '@ultima/ui';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';

const styles = stylex.create({
  scroll: { blockSize: '8rem' },
});

const themes = [
  { name: 'dark', theme: darkTheme, scheme: colorScheme.dark },
  { name: 'light', theme: lightTheme, scheme: colorScheme.light },
];

function Sample({ name = 'Docs', children }: { name?: string; children?: ReactNode }) {
  return (
    <Sidebar.Root>
      <Sidebar.Trigger render={<Button variant="ghost" aria-label="Toggle navigation" />} />
      <Sidebar.Panel aria-label={name} data-testid="panel">
        <Sidebar.Group>
          <Sidebar.GroupLabel>Reference</Sidebar.GroupLabel>
          <Sidebar.List data-testid="list">
            <Sidebar.Item>
              <Sidebar.Link href="#tokens" active>
                Tokens
              </Sidebar.Link>
            </Sidebar.Item>
            <Sidebar.Item>
              <Sidebar.Link href="#palette">Palette</Sidebar.Link>
            </Sidebar.Item>
            <Sidebar.Item>
              <Sidebar.Button>Components</Sidebar.Button>
            </Sidebar.Item>
          </Sidebar.List>
        </Sidebar.Group>
        {children}
      </Sidebar.Panel>
      <Sidebar.Close render={<Button variant="ghost" aria-label="Close navigation" />} />
    </Sidebar.Root>
  );
}

test('every part mounts together and no props leaves the panel open', async () => {
  const screen = await render(<Sample />);
  const panel = screen.getByTestId('panel').element();

  expect(panel.tagName).toBe('NAV');
  expect(panel).toHaveAttribute('data-open');
  expect(panel).not.toHaveAttribute('data-closed');
  await expect.element(screen.getByRole('heading', { name: 'Reference', level: 3 })).toBeVisible();
  expect(screen.getByTestId('list').element().tagName).toBe('UL');
  await expect.element(screen.getByRole('link', { name: 'Tokens' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Components' })).toBeVisible();
});

test('useSidebar throws by name outside Sidebar.Root', async () => {
  function Outside() {
    useSidebar();
    return null;
  }

  await expect(render(<Outside />)).rejects.toThrowError('useSidebar must be used inside Sidebar.Root');
});

test('useSidebar hands a consumer the state its own part needs', async () => {
  function Readout() {
    const { open, mobileOpen, isMobile, setOpen } = useSidebar();
    return (
      <button type="button" onClick={() => setOpen(!open)}>
        {`${open} ${mobileOpen} ${isMobile}`}
      </button>
    );
  }

  const screen = await render(
    <Sidebar.Root>
      <Readout />
      <Sidebar.Panel aria-label="Docs" data-testid="panel" />
    </Sidebar.Root>,
  );

  const readout = screen.getByRole('button', { name: 'true false false' }).element();
  await userEvent.click(readout);
  await expect.element(screen.getByRole('button', { name: 'false false false' })).toBeVisible();
});

test('the panel takes its name from aria-labelledby as well as aria-label', async () => {
  const screen = await render(
    <Sidebar.Root>
      <h2 id="menu-heading">Site menu</h2>
      <Sidebar.Panel aria-labelledby="menu-heading" />
    </Sidebar.Root>,
  );
  await expect.element(screen.getByRole('navigation', { name: 'Site menu' })).toBeVisible();
});

for (const mode of themes) {
  test(`a link and a button draw the focus ring in ${mode.name}`, async () => {
    const screen = await render(
      <div {...stylex.props(mode.theme, mode.scheme)}>
        <Sidebar.Root>
          <Sidebar.Panel aria-label="Docs">
            <Sidebar.List>
              <Sidebar.Item>
                <Sidebar.Link href="#palette">Palette</Sidebar.Link>
              </Sidebar.Item>
              <Sidebar.Item>
                <Sidebar.Button>Components</Sidebar.Button>
              </Sidebar.Item>
            </Sidebar.List>
          </Sidebar.Panel>
        </Sidebar.Root>
      </div>,
    );

    const link = screen.getByRole('link', { name: 'Palette' }).element();
    await userEvent.tab();
    expect(document.activeElement).toBe(link);
    expect(getComputedStyle(link).outlineStyle).toBe('solid');
    expect(parseFloat(getComputedStyle(link).outlineWidth)).toBeGreaterThan(0);

    const button = screen.getByRole('button', { name: 'Components' }).element();
    await userEvent.tab();
    expect(document.activeElement).toBe(button);
    expect(getComputedStyle(button).outlineStyle).toBe('solid');
    expect(parseFloat(getComputedStyle(button).outlineWidth)).toBeGreaterThan(0);
  });

  test(`the trigger ships no ring of its own and the rendered button brings one in ${mode.name}`, async () => {
    const screen = await render(
      <div {...stylex.props(mode.theme, mode.scheme)}>
        <Sidebar.Root>
          <Sidebar.Trigger aria-label="Bare toggle" />
          <Sidebar.Trigger render={<Button variant="ghost" aria-label="Rendered toggle" />} />
          <Sidebar.Panel aria-label="Docs" />
        </Sidebar.Root>
      </div>,
    );

    const bare = screen.getByRole('button', { name: 'Bare toggle' }).element();
    await userEvent.tab();
    expect(document.activeElement).toBe(bare);
    expect(getComputedStyle(bare).outlineStyle).not.toBe('solid');

    const rendered = screen.getByRole('button', { name: 'Rendered toggle' }).element();
    await userEvent.tab();
    expect(document.activeElement).toBe(rendered);
    expect(getComputedStyle(rendered).outlineStyle).toBe('solid');
  });
}

test('Tab reaches every link and button in the panel', async () => {
  const screen = await render(<Sample />);
  const order = [
    screen.getByRole('button', { name: 'Toggle navigation' }).element(),
    screen.getByRole('link', { name: 'Tokens' }).element(),
    screen.getByRole('link', { name: 'Palette' }).element(),
    screen.getByRole('button', { name: 'Components' }).element(),
  ];

  for (const element of order) {
    await userEvent.tab();
    expect(document.activeElement).toBe(element);
  }
});

test('a nested group discloses through Collapsible.Trigger render={<Sidebar.Button />}', async () => {
  const screen = await render(
    <Sample>
      <Sidebar.List>
        <Collapsible.Root render={<Sidebar.Item />}>
          <Collapsible.Trigger render={<Sidebar.Button />}>Guides</Collapsible.Trigger>
          <Collapsible.Panel data-testid="nested-panel">
            <Sidebar.List data-testid="nested-list">
              <Sidebar.Item>
                <Sidebar.Link href="#install">Install</Sidebar.Link>
              </Sidebar.Item>
            </Sidebar.List>
          </Collapsible.Panel>
        </Collapsible.Root>
      </Sidebar.List>
    </Sample>,
  );

  const trigger = screen.getByRole('button', { name: 'Guides' }).element();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect.element(screen.getByRole('link', { name: 'Install' })).toBeVisible();

  const panel = getComputedStyle(screen.getByTestId('nested-panel').element());
  expect(panel.transitionDuration).not.toBe('0s');
  expect(panel.animationName).toBe('none');

  await userEvent.keyboard('{Enter}');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('a nested list indents itself and the panel list does not', async () => {
  const screen = await render(
    <Sample>
      <Sidebar.List data-testid="outer">
        <Sidebar.Item>
          <Sidebar.List data-testid="inner">
            <Sidebar.Item>
              <Sidebar.Link href="#install">Install</Sidebar.Link>
            </Sidebar.Item>
          </Sidebar.List>
        </Sidebar.Item>
      </Sidebar.List>
    </Sample>,
  );

  const outer = getComputedStyle(screen.getByTestId('outer').element());
  const inner = getComputedStyle(screen.getByTestId('inner').element());
  expect(parseFloat(outer.paddingInlineStart)).toBe(0);
  expect(parseFloat(inner.paddingInlineStart)).toBeGreaterThan(0);
});

for (const mode of themes) {
  test(`the current link differs from a resting one beyond hue in ${mode.name}`, async () => {
    const screen = await render(
      <div {...stylex.props(mode.theme, mode.scheme)}>
        <Sample />
      </div>,
    );

    const current = screen.getByRole('link', { name: 'Tokens' }).element();
    const resting = screen.getByRole('link', { name: 'Palette' }).element();

    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).toHaveAttribute('data-active');
    expect(resting).not.toHaveAttribute('aria-current');
    expect(resting).not.toHaveAttribute('data-active');

    const currentStyle = getComputedStyle(current);
    const restingStyle = getComputedStyle(resting);
    expect(parseFloat(restingStyle.borderInlineStartWidth)).toBe(0);
    expect(parseFloat(currentStyle.borderInlineStartWidth)).toBeGreaterThan(0);
    expect(currentStyle.fontWeight).not.toBe(restingStyle.fontWeight);
    expect(currentStyle.backgroundColor).not.toBe(restingStyle.backgroundColor);
  });
}

test('a router-set aria-current styles the link with no active prop', async () => {
  const screen = await render(
    <Sample>
      <Sidebar.List>
        <Sidebar.Item>
          <Sidebar.Link href="#routed" aria-current="page">
            Routed
          </Sidebar.Link>
        </Sidebar.Item>
      </Sidebar.List>
    </Sample>,
  );

  const routed = screen.getByRole('link', { name: 'Routed' }).element();
  const resting = screen.getByRole('link', { name: 'Palette' }).element();
  expect(routed).not.toHaveAttribute('data-active');
  expect(parseFloat(getComputedStyle(routed).borderInlineStartWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(routed).backgroundColor).not.toBe(getComputedStyle(resting).backgroundColor);
});

test('the trigger toggles the desktop collapse and reports it through aria-expanded', async () => {
  const screen = await render(<Sample />);
  const trigger = screen.getByRole('button', { name: 'Toggle navigation' }).element();
  const panel = screen.getByTestId('panel').element();

  expect(trigger).toHaveAttribute('aria-controls', panel.id);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const openWidth = parseFloat(getComputedStyle(panel).inlineSize);

  await userEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(panel).toHaveAttribute('data-closed');
  expect(panel).not.toHaveAttribute('data-open');
  await expect.poll(() => parseFloat(getComputedStyle(panel).inlineSize)).toBe(0);
  expect(getComputedStyle(panel).visibility).toBe('hidden');
  expect(getComputedStyle(panel).transitionDuration).not.toBe('0s');

  await userEvent.click(trigger);
  await expect.poll(() => parseFloat(getComputedStyle(panel).inlineSize)).toBe(openWidth);
});

test('a controlled sidebar follows open and reports every change', async () => {
  const changes: boolean[] = [];

  function Controlled() {
    const [open, setOpen] = useState(true);
    return (
      <Sidebar.Root
        open={open}
        onOpenChange={(next) => {
          changes.push(next);
          setOpen(next);
        }}
      >
        <Sidebar.Trigger render={<Button variant="ghost" aria-label="Toggle navigation" />} />
        <Sidebar.Panel aria-label="Docs" data-testid="panel" />
      </Sidebar.Root>
    );
  }

  const screen = await render(<Controlled />);
  const trigger = screen.getByRole('button', { name: 'Toggle navigation' }).element();
  await userEvent.click(trigger);
  expect(screen.getByTestId('panel').element()).toHaveAttribute('data-closed');
  await userEvent.click(trigger);
  expect(screen.getByTestId('panel').element()).toHaveAttribute('data-open');
  expect(changes).toEqual([false, true]);
});

test('defaultOpen false starts collapsed', async () => {
  const screen = await render(
    <Sidebar.Root defaultOpen={false}>
      <Sidebar.Panel aria-label="Docs" data-testid="panel" />
    </Sidebar.Root>,
  );
  expect(screen.getByTestId('panel').element()).toHaveAttribute('data-closed');
});

test('the panel scrolls at a height set through the style slot', async () => {
  const screen = await render(
    <Sidebar.Root>
      <Sidebar.Panel aria-label="Docs" data-testid="panel" style={styles.scroll}>
        <Sidebar.List>
          {Array.from({ length: 20 }, (_, index) => (
            <Sidebar.Item key={index}>
              <Sidebar.Link href={`#item-${index}`}>{`Item ${index}`}</Sidebar.Link>
            </Sidebar.Item>
          ))}
        </Sidebar.List>
      </Sidebar.Panel>
    </Sidebar.Root>,
  );

  const panel = screen.getByTestId('panel').element();
  expect(getComputedStyle(panel).overflow).toBe('auto');
  expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
});

test('Close renders nothing above the breakpoint, where there is no menu to close', async () => {
  const screen = await render(<Sample />);
  expect(screen.container.querySelector('[aria-label="Close navigation"]')).toBeNull();
});

test('the panel type exposes the style slot, no className, and demands a name', () => {
  expectTypeOf<SidebarPanelProps>().not.toHaveProperty('className');
  expectTypeOf<SidebarPanelProps>().toHaveProperty('style');

  // @ts-expect-error a panel with neither aria-label nor aria-labelledby is rejected
  const unnamed = <Sidebar.Panel />;
  expect(unnamed).toBeTruthy();
});
