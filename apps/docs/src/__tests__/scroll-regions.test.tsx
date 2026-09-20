import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import axe from 'axe-core';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps, ComponentType } from 'react';
import { expect, onTestFinished, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { Prose } from '../prose';
import { PalettePage } from '../routes/palette';
// axe resolves a text contrast against the nearest painted ancestor, and the application's ground
// is on `body` rather than on a component, so without this the shell is measured over nothing.
import '../styles.css';

/**
 * The scroll regions the docs site owes the build effort, settled on
 * https://github.com/frankieramirez/ultima/issues/147: the uncaptioned MDX table wrapper and the
 * six palette ramp grids are Scroll Areas, so a region that overflows is a tab stop with a
 * painted bar and no landmark, and one that does not stays out of tab order.
 */

const modes = [
  { name: 'dark', theme: darkTheme, scheme: colorScheme.dark },
  { name: 'light', theme: lightTheme, scheme: colorScheme.light },
];

function themeDocument(mode: (typeof modes)[number]) {
  const classes = stylex.props(mode.theme, mode.scheme).className?.split(/\s+/).filter(Boolean) ?? [];
  document.documentElement.classList.add(...classes);
  onTestFinished(() => document.documentElement.classList.remove(...classes));
}

const styles = stylex.create({
  wide: { inlineSize: '160rem' },
});

function scrollAreaViewports(container: HTMLElement) {
  return container.querySelectorAll<HTMLElement>('[role="presentation"][tabindex]');
}

/** What `@mdx-js/rollup` hands `Prose` for two GFM tables with no captions. */
function TwoWideTables({ components }: { components?: MDXComponents }) {
  const Table = (components?.table ?? 'table') as ComponentType<ComponentProps<'table'>>;
  const Th = (components?.th ?? 'th') as ComponentType<ComponentProps<'th'>>;
  const Td = (components?.td ?? 'td') as ComponentType<ComponentProps<'td'>>;
  const body = (
    <tbody>
      <tr>
        <Th>Property</Th>
        <Td>
          <div {...stylex.props(styles.wide)} />
        </Td>
      </tr>
    </tbody>
  );
  return (
    <>
      <Table>{body}</Table>
      <Table>{body}</Table>
    </>
  );
}

for (const mode of modes) {
  test(`two wide uncaptioned tables in prose pass axe in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(<Prose Content={TwoWideTables} breadcrumb="DOCUMENTATION / TEST" />);

    const viewports = scrollAreaViewports(screen.container);
    expect(viewports.length).toBe(2);
    await expect
      .poll(() => [...viewports].every((viewport) => viewport.tabIndex === 0))
      .toBe(true);
    expect(
      screen.container.querySelectorAll('[data-orientation="horizontal"]').length,
    ).toBeGreaterThan(0);
    expect(screen.container.querySelectorAll('[role="region"]').length).toBe(0);

    const results = await axe.run(document.body);
    expect(results.violations.map(describe)).toEqual([]);
  });

  test(`/palette passes axe in ${mode.name} with no ramp grid in tab order`, async () => {
    themeDocument(mode);
    const screen = await render(<PalettePage />);
    await expect
      .element(screen.getByRole('heading', { name: 'Palette', level: 1 }))
      .toBeVisible();

    // Base UI drops the viewport's tabIndex to -1 when neither axis overflows, and the ramp
    // grid wraps to its column rather than scrolling, so none of the six is a dead tab stop.
    const viewports = scrollAreaViewports(screen.container);
    expect(viewports.length).toBe(6);
    await expect
      .poll(() => [...viewports].every((viewport) => viewport.tabIndex === -1))
      .toBe(true);

    const regions = screen.container.querySelectorAll('[role="region"]');
    expect(regions.length).toBe(2);
    expect([...regions].every((region) => region.hasAttribute('aria-labelledby'))).toBe(true);

    const results = await axe.run(document.body);
    expect(results.violations.map(describe)).toEqual([]);
  });
}

function describe(violation: axe.Result) {
  return `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`;
}
