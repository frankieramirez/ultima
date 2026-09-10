import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { ToggleGroup, type ToggleGroupItemProps, type ToggleGroupRootProps } from '@ultima/ui';
import { useState } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';

const styles = stylex.create({
  wide: { paddingInline: space['--ult-space-12'] },
});

const themes = [
  { name: 'dark', theme: darkTheme, scheme: colorScheme.dark },
  { name: 'light', theme: lightTheme, scheme: colorScheme.light },
];

type ViewProps = Omit<ToggleGroupRootProps<'list' | 'grid' | 'chart'>, 'aria-label'>;

function Views({ children, ...props }: ViewProps) {
  return (
    <ToggleGroup.Root aria-label="Layout" {...props}>
      {children ?? (
        <>
          <ToggleGroup.Item value="list">List</ToggleGroup.Item>
          <ToggleGroup.Item value="grid">Grid</ToggleGroup.Item>
          <ToggleGroup.Item value="chart">Chart</ToggleGroup.Item>
        </>
      )}
    </ToggleGroup.Root>
  );
}

test('a group with no value renders three unpressed items', async () => {
  const screen = await render(<Views />);
  await expect.element(screen.getByRole('group', { name: 'Layout' })).toBeVisible();
  for (const name of ['List', 'Grid', 'Chart']) {
    expect(screen.getByRole('button', { name }).element()).toHaveAttribute('aria-pressed', 'false');
  }
});

test('the group is named by aria-label and each item by its own text', async () => {
  const screen = await render(<Views defaultValue={['grid']} />);
  const group = screen.getByRole('group', { name: 'Layout' }).element();
  expect(group).toHaveAttribute('role', 'group');
  expect(screen.getByRole('button', { name: 'Grid' }).element()).toHaveAttribute('aria-pressed', 'true');
});

test('an item can be named by aria-label when its content is not text', async () => {
  const screen = await render(
    <Views>
      <ToggleGroup.Item value="list" aria-label="List view">
        <svg aria-hidden="true" viewBox="0 0 16 16" width="1em" height="1em" />
      </ToggleGroup.Item>
    </Views>,
  );
  await expect.element(screen.getByRole('button', { name: 'List view' })).toBeVisible();
});

test('orientation, multiple, loopFocus and disabled all pass through to the primitive', async () => {
  const screen = await render(
    <Views orientation="vertical" multiple loopFocus={false} disabled defaultValue={['list', 'grid']} />,
  );
  const group = screen.getByRole('group', { name: 'Layout' }).element();
  expect(group).toHaveAttribute('data-orientation', 'vertical');
  expect(group).toHaveAttribute('data-multiple');
  expect(group).toHaveAttribute('data-disabled');
  expect(screen.getByRole('button', { name: 'List' }).element()).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Grid' }).element()).toHaveAttribute('aria-pressed', 'true');
  expect(getComputedStyle(group).flexDirection).toBe('column');
});

test('a horizontal group lays its items out in a row', async () => {
  const screen = await render(<Views />);
  const group = screen.getByRole('group', { name: 'Layout' }).element();
  expect(group).toHaveAttribute('data-orientation', 'horizontal');
  expect(getComputedStyle(group).flexDirection).toBe('row');
});

test('an uncontrolled group tracks the pressed item and a controlled one follows its value', async () => {
  const changes: string[][] = [];

  function Controlled() {
    const [value, setValue] = useState<('list' | 'grid' | 'chart')[]>(['list']);
    return (
      <Views
        value={value}
        onValueChange={(next) => {
          changes.push(next);
          setValue(next);
        }}
      />
    );
  }

  const screen = await render(<Controlled />);
  await userEvent.click(screen.getByRole('button', { name: 'Chart' }).element());
  expect(screen.getByRole('button', { name: 'Chart' }).element()).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'List' }).element()).toHaveAttribute('aria-pressed', 'false');
  expect(changes).toEqual([['chart']]);
});

test('arrow keys move the roving focus along the orientation, and Home and End reach the ends', async () => {
  const screen = await render(<Views />);
  const list = screen.getByRole('button', { name: 'List' }).element();
  const grid = screen.getByRole('button', { name: 'Grid' }).element();
  const chart = screen.getByRole('button', { name: 'Chart' }).element();

  await userEvent.tab();
  expect(document.activeElement).toBe(list);
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(grid);
  await userEvent.keyboard('{End}');
  expect(document.activeElement).toBe(chart);
  await userEvent.keyboard('{Home}');
  expect(document.activeElement).toBe(list);
  await userEvent.keyboard('{ArrowLeft}');
  expect(document.activeElement).toBe(chart);
});

test('a vertical group moves on the vertical arrows', async () => {
  const screen = await render(<Views orientation="vertical" />);
  await userEvent.tab();
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Grid' }).element());
});

test('loopFocus false stops the focus at the last item', async () => {
  const screen = await render(<Views loopFocus={false} />);
  await userEvent.tab();
  await userEvent.keyboard('{End}');
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Chart' }).element());
});

for (const key of ['{ }', '{Enter}'] as const) {
  test(`${key} presses the focused item`, async () => {
    const screen = await render(<Views />);
    await userEvent.tab();
    await userEvent.keyboard(key);
    expect(screen.getByRole('button', { name: 'List' }).element()).toHaveAttribute('aria-pressed', 'true');
  });
}

test('a single-selection group empties when the pressed item is pressed again', async () => {
  const changes: string[][] = [];
  const screen = await render(<Views defaultValue={['grid']} onValueChange={(next) => changes.push(next)} />);
  await userEvent.click(screen.getByRole('button', { name: 'Grid' }).element());
  expect(changes).toEqual([[]]);
  expect(screen.getByRole('button', { name: 'Grid' }).element()).toHaveAttribute('aria-pressed', 'false');
});

test('cancelling the empty change keeps the selection', async () => {
  const changes: string[][] = [];

  function Required() {
    const [value, setValue] = useState<('list' | 'grid' | 'chart')[]>(['grid']);
    return (
      <Views
        value={value}
        onValueChange={(next, eventDetails) => {
          changes.push(next);
          if (next.length === 0) {
            eventDetails.cancel();
            return;
          }
          setValue(next);
        }}
      />
    );
  }

  const screen = await render(<Required />);
  const grid = screen.getByRole('button', { name: 'Grid' }).element();
  await userEvent.click(grid);
  expect(changes).toEqual([[]]);
  expect(grid).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Chart' }).element());
  expect(screen.getByRole('button', { name: 'Chart' }).element()).toHaveAttribute('aria-pressed', 'true');
});

test('a multiple group collects every pressed value', async () => {
  const screen = await render(<Views multiple />);
  await userEvent.click(screen.getByRole('button', { name: 'List' }).element());
  await userEvent.click(screen.getByRole('button', { name: 'Chart' }).element());
  expect(screen.getByRole('button', { name: 'List' }).element()).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Chart' }).element()).toHaveAttribute('aria-pressed', 'true');
});

for (const mode of themes) {
  test(`the pressed item is painted apart from a resting one in ${mode.name}`, async () => {
    const screen = await render(
      <div {...stylex.props(mode.theme, mode.scheme)}>
        <Views defaultValue={['grid']} />
      </div>,
    );
    const pressed = screen.getByRole('button', { name: 'Grid' }).element();
    const resting = screen.getByRole('button', { name: 'List' }).element();
    expect(pressed).toHaveAttribute('data-pressed');
    expect(resting).not.toHaveAttribute('data-pressed');
    expect(getComputedStyle(pressed).backgroundColor).not.toBe(getComputedStyle(resting).backgroundColor);
    expect(getComputedStyle(pressed).color).not.toBe(getComputedStyle(resting).color);
  });

  test(`the item draws the focus ring in ${mode.name}`, async () => {
    const screen = await render(
      <div {...stylex.props(mode.theme, mode.scheme)}>
        <Views />
      </div>,
    );
    const list = screen.getByRole('button', { name: 'List' }).element();
    await userEvent.tab();
    expect(document.activeElement).toBe(list);
    expect(getComputedStyle(list).outlineStyle).toBe('solid');
    expect(parseFloat(getComputedStyle(list).outlineWidth)).toBeGreaterThan(0);
  });

  test(`the group itself never draws a ring in ${mode.name}`, async () => {
    const screen = await render(
      <div {...stylex.props(mode.theme, mode.scheme)}>
        <Views />
      </div>,
    );
    const group = screen.getByRole('group', { name: 'Layout' }).element();
    expect(getComputedStyle(group).outlineStyle).toBe('none');
  });
}

test('hovering the pressed item leaves the selection where it is', async () => {
  const screen = await render(<Views defaultValue={['grid']} />);
  const pressed = screen.getByRole('button', { name: 'Grid' }).element();
  const resting = screen.getByRole('button', { name: 'List' }).element();
  const painted = getComputedStyle(pressed).backgroundColor;

  await userEvent.hover(resting);
  const hovered = getComputedStyle(resting).backgroundColor;
  expect(hovered).not.toBe(getComputedStyle(pressed).backgroundColor);

  await userEvent.hover(pressed);
  expect(getComputedStyle(pressed).backgroundColor).toBe(painted);
  expect(getComputedStyle(pressed).backgroundColor).not.toBe(hovered);
});

test('a disabled group dims its items and drops the pointer cursor', async () => {
  const screen = await render(<Views disabled />);
  const list = screen.getByRole('button', { name: 'List' }).element();
  expect(list).toHaveAttribute('data-disabled');
  expect(parseFloat(getComputedStyle(list).opacity)).toBeLessThan(1);
  expect(getComputedStyle(list).cursor).toBe('default');
});

test('the style slot wins over the item style it overrides', async () => {
  const screen = await render(
    <Views>
      <ToggleGroup.Item value="list">List</ToggleGroup.Item>
      <ToggleGroup.Item value="grid" style={styles.wide}>
        Grid
      </ToggleGroup.Item>
    </Views>,
  );
  const list = screen.getByRole('button', { name: 'List' }).element();
  const grid = screen.getByRole('button', { name: 'Grid' }).element();
  expect(parseFloat(getComputedStyle(grid).paddingInlineStart)).toBeGreaterThan(
    parseFloat(getComputedStyle(list).paddingInlineStart),
  );
});

test('the part types expose the style slot, no className, and the value generic', () => {
  expectTypeOf<ToggleGroupRootProps>().not.toHaveProperty('className');
  expectTypeOf<ToggleGroupItemProps>().not.toHaveProperty('className');
  expectTypeOf<ToggleGroupRootProps>().toHaveProperty('style');
  expectTypeOf<ToggleGroupItemProps>().toHaveProperty('style');
  expectTypeOf<ToggleGroupItemProps<'list' | 'grid'>['value']>().toEqualTypeOf<'list' | 'grid' | undefined>();
  expectTypeOf<ToggleGroupRootProps<'list' | 'grid'>['value']>().toEqualTypeOf<
    readonly ('list' | 'grid')[] | undefined
  >();
});
