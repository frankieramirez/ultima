import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import * as stylex from '@stylexjs/stylex';
import { Accordion, type AccordionPanelProps, type AccordionRootProps } from '@ultima/ui';
import type { ReactNode } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';

const styles = stylex.create({
  grid: { display: 'grid' },
});

const themes = [
  { name: 'dark', theme: darkTheme, scheme: colorScheme.dark },
  { name: 'light', theme: lightTheme, scheme: colorScheme.light },
];

function Sample({ name = 'Details', children }: { name?: string; children?: ReactNode }) {
  return (
    <Accordion.Root>
      <Accordion.Item value="a">
        <Accordion.Header>
          <Accordion.Trigger>{name}</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel data-testid="panel">{children ?? <p>Panel body</p>}</Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  );
}

test('an accordion with no props renders closed', async () => {
  const screen = await render(<Sample />);
  await expect.element(screen.getByRole('button', { name: 'Details' })).toBeVisible();
  expect(screen.container.querySelector('[data-testid="panel"]')).toBeNull();
});

test('an uncontrolled accordion opens and closes from the trigger', async () => {
  const screen = await render(<Sample />);
  const trigger = screen.getByRole('button', { name: 'Details' }).element();
  await userEvent.click(trigger);
  await expect.element(screen.getByTestId('panel')).toBeVisible();
  await userEvent.click(trigger);
  await expect.element(screen.getByTestId('panel')).not.toBeInTheDocument();
});

test('the open panel is a named region labelled by its trigger', async () => {
  const screen = await render(<Sample name="Release notes" />);
  const trigger = screen.getByRole('button', { name: 'Release notes' }).element();
  await userEvent.click(trigger);
  const panel = screen.getByRole('region', { name: 'Release notes' }).element();
  expect(panel).toHaveAttribute('aria-labelledby', trigger.id);
});

for (const mode of themes) {
  test(`the rendered trigger draws the focus ring in ${mode.name}`, async () => {
    const screen = await render(
      <div {...stylex.props(mode.theme, mode.scheme)}>
        <Sample />
      </div>,
    );
    const trigger = screen.getByRole('button', { name: 'Details' }).element();
    await userEvent.tab();
    expect(document.activeElement).toBe(trigger);
    expect(getComputedStyle(trigger).outlineStyle).toBe('solid');
    expect(parseFloat(getComputedStyle(trigger).outlineWidth)).toBeGreaterThan(0);
  });

  test(`the open panel carries the height transition in ${mode.name}`, async () => {
    const screen = await render(
      <div {...stylex.props(mode.theme, mode.scheme)}>
        <Sample />
      </div>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Details' }).element());
    const panel = getComputedStyle(screen.getByTestId('panel').element());
    expect(panel.transitionProperty).toBe('height');
    expect(panel.transitionDuration).not.toBe('0s');
    expect(panel.animationName).toBe('none');
    expect(panel.overflow).toBe('hidden');
  });
}

test('a disabled trigger keeps its tab stop and reports through aria-disabled', async () => {
  const screen = await render(
    <Accordion.Root>
      <Accordion.Item value="a">
        <Accordion.Header>
          <Accordion.Trigger disabled>Details</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Panel body</Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>,
  );
  const trigger = screen.getByRole('button', { name: 'Details' }).element();
  expect(trigger).toHaveAttribute('tabindex', '0');
  expect(trigger).toHaveAttribute('aria-disabled', 'true');
  expect(trigger).not.toHaveAttribute('disabled');
});

test('the panel height is driven by the variable the primitive seeds', async () => {
  const screen = await render(<Sample />);
  await userEvent.click(screen.getByRole('button', { name: 'Details' }).element());
  const panel = screen.getByTestId('panel').element();
  expect(panel.style.getPropertyValue('--accordion-panel-height')).not.toBe('');
  await expect.poll(() => parseFloat(getComputedStyle(panel).height)).toBeGreaterThan(0);
});

test('a kept-mounted closed panel stays display none through a consumer display override', async () => {
  const screen = await render(
    <Accordion.Root>
      <Accordion.Item value="a">
        <Accordion.Header>
          <Accordion.Trigger>Details</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel data-testid="panel" keepMounted style={styles.grid}>
          Panel body
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>,
  );
  const panel = screen.getByTestId('panel').element();
  expect(panel).toHaveAttribute('hidden');
  expect(getComputedStyle(panel).display).toBe('none');
});

test('a rendered heading level carries the state attributes', async () => {
  const screen = await render(
    <Accordion.Root>
      <Accordion.Item value="a">
        <Accordion.Header render={<h2 />}>
          <Accordion.Trigger>Details</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Panel body</Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>,
  );
  const heading = screen.getByRole('heading', { level: 2 }).element();
  expect(heading.tagName).toBe('H2');
  expect(heading.contains(screen.getByRole('button', { name: 'Details' }).element())).toBe(true);
});

test('the root type drops the deprecated props', () => {
  expectTypeOf<AccordionRootProps>().not.toHaveProperty('orientation');
  expectTypeOf<AccordionRootProps>().not.toHaveProperty('loopFocus');
});

test('the panel type exposes the style slot and no className', () => {
  expectTypeOf<AccordionPanelProps>().not.toHaveProperty('className');
  expectTypeOf<AccordionPanelProps>().toHaveProperty('style');
});
