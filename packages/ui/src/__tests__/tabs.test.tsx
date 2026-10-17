import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Tabs,
  type TabsIndicatorProps,
  type TabsListProps,
  type TabsPanelProps,
  type TabsRootProps,
  type TabsTabProps,
  type TabsVariant,
} from '@ultima/ui';
import { hoversOnlyWhereHover } from './hover';
import { resolved } from './overlay';

type SampleProps = {
  name: string;
  variant?: TabsVariant;
  orientation?: 'horizontal' | 'vertical';
};

function Sample({ name, variant, orientation }: SampleProps) {
  return (
    <Tabs.Root variant={variant} orientation={orientation} defaultValue="tokens">
      <Tabs.List aria-label={name}>
        <Tabs.Tab value="tokens">{`${name} tokens`}</Tabs.Tab>
        <Tabs.Tab value="themes">{`${name} themes`}</Tabs.Tab>
        <Tabs.Indicator />
      </Tabs.List>
      <Tabs.Panel value="tokens">The token scales</Tabs.Panel>
      <Tabs.Panel value="themes">The two themes</Tabs.Panel>
    </Tabs.Root>
  );
}

for (const variant of ['underline', 'segmented'] as const) {
  test(`${variant} renders`, async () => {
    const screen = await render(<Sample name={variant} variant={variant} />);
    await expect.element(screen.getByRole('tab', { name: `${variant} tokens` })).toBeVisible();
    await expect.element(screen.getByRole('tabpanel')).toBeVisible();
  });
}

test('omitted variant matches underline', async () => {
  const screen = await render(
    <>
      <Sample name="implicit" />
      <Sample name="explicit" variant="underline" />
    </>,
  );
  const implicit = screen.getByRole('tablist', { name: 'implicit' }).element();
  const explicit = screen.getByRole('tablist', { name: 'explicit' }).element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('a tab is named by its text and its panel is a tabpanel', async () => {
  const screen = await render(<Sample name="docs" />);
  await expect.element(screen.getByRole('tab', { name: 'docs tokens' })).toBeVisible();
  await expect.element(screen.getByRole('tab', { name: 'docs themes' })).toBeVisible();
  await expect.element(screen.getByRole('tabpanel', { name: 'docs tokens' })).toHaveTextContent('The token scales');
});

test('keyboard focus draws the outline on the tab, not the list or the panel', async () => {
  const screen = await render(<Sample name="docs" />);
  await expect.element(screen.getByRole('tab', { name: 'docs tokens' })).toBeVisible();
  const tab = screen.getByRole('tab', { name: 'docs tokens' }).element();
  const list = screen.getByRole('tablist').element();
  const panel = screen.getByRole('tabpanel').element();
  await userEvent.tab();
  expect(document.activeElement).toBe(tab);
  expect(parseFloat(getComputedStyle(tab).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(tab).outlineStyle).toBe('solid');
  expect(getComputedStyle(list).outlineStyle).toBe('none');
  expect(getComputedStyle(panel).outlineStyle).toBe('none');
});

test('ArrowRight moves focus and Enter activates, switching the panel', async () => {
  const screen = await render(<Sample name="docs" />);
  await expect.element(screen.getByRole('tabpanel')).toHaveTextContent('The token scales');
  const themes = screen.getByRole('tab', { name: 'docs themes' }).element();
  await userEvent.tab();
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(themes);
  expect(themes).not.toHaveAttribute('data-active');
  await userEvent.keyboard('{Enter}');
  expect(themes).toHaveAttribute('data-active');
  await expect.element(screen.getByRole('tabpanel')).toHaveTextContent('The two themes');
});

test('data-active recolors the tab', async () => {
  const screen = await render(<Sample name="docs" />);
  await expect.element(screen.getByRole('tab', { name: 'docs tokens' })).toBeVisible();
  const active = screen.getByRole('tab', { name: 'docs tokens' }).element();
  const inactive = screen.getByRole('tab', { name: 'docs themes' }).element();
  expect(active).toHaveAttribute('data-active');
  expect(inactive).not.toHaveAttribute('data-active');
  expect(getComputedStyle(active).color).not.toBe(getComputedStyle(inactive).color);
});

test('a vertical orientation stacks the list', async () => {
  const screen = await render(
    <>
      <Sample name="across" />
      <Sample name="down" orientation="vertical" />
    </>,
  );
  const across = screen.getByRole('tablist', { name: 'across' }).element();
  const down = screen.getByRole('tablist', { name: 'down' }).element();
  expect(down).toHaveAttribute('data-orientation', 'vertical');
  expect(getComputedStyle(across).flexDirection).toBe('row');
  expect(getComputedStyle(down).flexDirection).toBe('column');
});

test('public prop types expose only supported styling axes', () => {
  expectTypeOf<TabsVariant>().toEqualTypeOf<'underline' | 'segmented'>();
  expectTypeOf<TabsRootProps>().not.toHaveProperty('className');
  expectTypeOf<TabsListProps>().not.toHaveProperty('className');
  expectTypeOf<TabsTabProps>().not.toHaveProperty('className');
  expectTypeOf<TabsIndicatorProps>().not.toHaveProperty('className');
  expectTypeOf<TabsPanelProps>().not.toHaveProperty('className');
  expectTypeOf<TabsRootProps>().toHaveProperty('variant');
  expectTypeOf<TabsListProps>().not.toHaveProperty('variant');
});

test('an underline tab stands at the md control height and hovers only where the device hovers', async () => {
  const screen = await render(<Sample name="line" />);
  const tab = screen.getByRole('tab', { name: 'line themes' }).element();
  expect(tab.getBoundingClientRect().height).toBeCloseTo(40, 0);
  expect(hoversOnlyWhereHover(tab)).toBe(true);
});

test('a segmented list is 32px tall and its indicator lifts on a hairline and shadow-xs', async () => {
  const screen = await render(<Sample name="seg" variant="segmented" />);
  const list = screen.getByRole('tablist', { name: 'seg' }).element();
  expect(list.getBoundingClientRect().height).toBeCloseTo(32, 0);
  const indicator = list.querySelector('[role="presentation"], span:not([role])') as Element;
  const style = getComputedStyle(indicator);
  expect(style.boxShadow).toBe(resolved('box-shadow', 'var(--ult-shadow-xs)'));
  expect(parseFloat(style.borderTopWidth)).toBeGreaterThan(0);
});

test('a disabled tab takes the disabled ink instead of fading', async () => {
  const screen = await render(
    <Tabs.Root defaultValue="a">
      <Tabs.List aria-label="States">
        <Tabs.Tab value="a">Live</Tabs.Tab>
        <Tabs.Tab value="b" disabled>Off</Tabs.Tab>
      </Tabs.List>
    </Tabs.Root>,
  );
  const off = getComputedStyle(screen.getByRole('tab', { name: 'Off' }).element());
  expect(off.opacity).toBe('1');
  expect(off.color).toBe(resolved('color', 'var(--ult-color-text-disabled)'));
});
