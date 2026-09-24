import * as stylex from '@stylexjs/stylex';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps, ComponentType } from 'react';
import { expect, onTestFinished, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import MonthsCalendar from '../demos/calendar/months';
import AddonsInputGroup from '../demos/input-group/addons';
import LinkedPages from '../demos/pagination/links';
import PageWindow from '../demos/pagination/window';
import WindowSize from '../demos/pagination/window-size';
import BasicScrollArea from '../demos/scroll-area/basic';
import BothAxesScrollArea from '../demos/scroll-area/both-axes';
import FadeScrollArea from '../demos/scroll-area/fade';
import ChartRecipe from '../demos/table/chart';
import DataTablePagination from '../demos/table/data-table-pagination';
import { Prose } from '../prose';
import { PalettePage } from '../routes/palette';
import { renderWithRouter } from './render-with-router';

const previewColumnInlineSize = '20rem';

const styles = stylex.create({
  figure: { inlineSize: previewColumnInlineSize },
});

test('the palette ramps fit their column at a narrow viewport', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));

  const { container } = await renderWithRouter(<PalettePage />);
  const main = container.querySelector('main') as HTMLElement;
  const viewports = container.querySelectorAll<HTMLElement>('[role="presentation"][tabindex]');

  expect(viewports.length).toBe(6);
  for (const viewport of viewports) {
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
  }
  expect(main.scrollWidth).toBeLessThanOrEqual(main.clientWidth);
});

test('the palette step captions and ramp labels hold one line at every width', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));

  const { container } = await renderWithRouter(<PalettePage />);
  const text = container.textContent ?? '';

  expect(text.match(/brand anchor/g) ?? []).toHaveLength(2);
  expect(text).toContain('step 1 is the brand anchor');
  expect(text).toContain('step 12 is the brand anchor');

  const labels = [...container.querySelectorAll<HTMLElement>('p')].filter((p) =>
    /^(dark|light)\b/.test(p.textContent ?? ''),
  );
  expect(labels.length).toBe(12);

  const assertOneLine = () => {
    expect(new Set(labels.map((label) => label.getBoundingClientRect().height)).size).toBe(1);
    for (const label of labels) {
      const ramp = label.nextElementSibling as HTMLElement;
      const heights = [...ramp.children].map(
        (swatch) => (swatch.lastElementChild as HTMLElement).getBoundingClientRect().height,
      );
      expect(new Set(heights).size).toBe(1);
    }
  };

  assertOneLine();
  await page.viewport(1440, 900);
  assertOneLine();
});

const paginationDemos = [
  { name: 'window', Demo: PageWindow },
  { name: 'links', Demo: LinkedPages },
  { name: 'window-size', Demo: WindowSize },
];

for (const { name, Demo } of paginationDemos) {
  test(`the pagination/${name} demo fits its figure at a narrow viewport`, async () => {
    const { container } = await render(
      <div {...stylex.props(styles.figure)}>
        <Demo />
      </div>,
    );
    const figure = container.firstElementChild as HTMLElement;

    expect(figure.scrollWidth).toBeLessThanOrEqual(figure.clientWidth);
  });
}

test('the calendar/months demo scrolls its two-month panel inside its figure', async () => {
  const { container } = await render(
    <div {...stylex.props(styles.figure)}>
      <MonthsCalendar />
    </div>,
  );
  const figure = container.firstElementChild as HTMLElement;
  const grids = container.querySelectorAll('[role="grid"]');

  expect(figure.scrollWidth).toBeLessThanOrEqual(figure.clientWidth);
  expect(grids.length).toBe(2);
});

const wideDemos = [
  { name: 'input-group/addons', Demo: AddonsInputGroup },
  { name: 'table/chart', Demo: ChartRecipe },
  { name: 'table/data-table-pagination', Demo: DataTablePagination },
];

for (const { name, Demo } of wideDemos) {
  test(`the ${name} demo fits its figure at a narrow viewport`, async () => {
    const { container } = await render(
      <div {...stylex.props(styles.figure)}>
        <Demo />
      </div>,
    );
    const figure = container.firstElementChild as HTMLElement;

    expect(figure.scrollWidth).toBeLessThanOrEqual(figure.clientWidth);
  });
}

function SlashJoinedCodeRun({ components }: { components?: MDXComponents }) {
  const P = (components?.p ?? 'p') as ComponentType<ComponentProps<'p'>>;
  const Code = (components?.code ?? 'code') as ComponentType<ComponentProps<'code'>>;
  return (
    <P>
      the <Code>scrollPrev</Code>/<Code>scrollNext</Code>/<Code>canScrollPrev</Code>/
      <Code>canScrollNext</Code> surface
    </P>
  );
}

test('a run of inline code fits the prose column at a narrow viewport', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));

  const { container } = await renderWithRouter(
    <Prose Content={SlashJoinedCodeRun} breadcrumb={[{ label: 'Components', to: '/components' }, { label: 'Test' }]} />,
  );
  const main = container.querySelector('main') as HTMLElement;

  expect(main.scrollWidth).toBeLessThanOrEqual(main.clientWidth);
});

const scrollAreaDemos: { name: string; Demo: ComponentType; axis: 'x' | 'y' }[] = [
  { name: 'basic', Demo: BasicScrollArea, axis: 'y' },
  { name: 'both-axes', Demo: BothAxesScrollArea, axis: 'x' },
  { name: 'fade', Demo: FadeScrollArea, axis: 'y' },
];

for (const { name, Demo, axis } of scrollAreaDemos) {
  test(`the scroll-area/${name} demo bounds fit its figure at a narrow viewport`, async () => {
    const { container } = await render(
      <div {...stylex.props(styles.figure)}>
        <Demo />
      </div>,
    );
    const figure = container.firstElementChild as HTMLElement;
    const viewport = container.querySelector<HTMLElement>('[role="presentation"][tabindex]');

    expect(figure.scrollWidth).toBeLessThanOrEqual(figure.clientWidth);
    if (axis === 'x') {
      expect(viewport!.scrollWidth).toBeGreaterThan(viewport!.clientWidth);
    } else {
      expect(viewport!.scrollHeight).toBeGreaterThan(viewport!.clientHeight);
    }
  });
}
