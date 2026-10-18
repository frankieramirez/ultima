import * as stylex from '@stylexjs/stylex';
import { barY } from '@tanstack/charts/bar';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { defineChart } from '@tanstack/charts/scene';
import { Chart, type ChartCaptionProps, type ChartPlotProps, type ChartRootProps } from '@ultima/ui';
import { expect, expectTypeOf, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { themeDocument, themes, violations } from './axe';
import { tokenValue } from './token-value';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: no axes; the canonical bar chart renders in both color modes, sized
 *    by `height` or by `aspectRatio`.
 * 2. The name resolves: the figure is named by its caption, and the plot is `role="img"` with
 *    `aria-roledescription="chart"`, labelled by the same caption.
 * 3. The focus ring lands where the contract says: on nothing yet; the plot takes no focus until the
 *    keyboard model ships.
 * 4. The primitive is still wired: no primitive; `useRender` carries `render` and `ref` on Root and
 *    Caption, and the scene comes from `createChartRuntime` at the plot's measured size.
 * 5. Documented state drives its style: none; Chart has no data-* state.
 * 6. Typecheck passes: `height` and `aspectRatio` are mutually exclusive, className is rejected,
 *    and Plot takes no `render`.
 * 7. Behavior this component wires itself: the plot draws the scene's bars, rules and labels from
 *    tokens, with no `ts-chart` class or scene paint string, and the definition's own theme, tooltip,
 *    keyboard, focus ring and animation ignored.
 * 8. CSS the primitive reads: no primitive; the one inline declaration is the plot's size.
 */

const weekdays = [
  { day: 'Mon', requests: 84_200 },
  { day: 'Tue', requests: 91_700 },
  { day: 'Wed', requests: 88_100 },
  { day: 'Thu', requests: 96_300 },
  { day: 'Fri', requests: 90_800 },
  { day: 'Sat', requests: 41_500 },
  { day: 'Sun', requests: 38_900 },
];

const weekdayChart = defineChart({
  marks: [barY(weekdays, { x: 'day', y: 'requests' })],
  scales: {
    x: { scale: scaleBand, axis: { label: 'Day' } },
    y: { scale: scaleLinear, nice: true, grid: true },
  },
});

const styles = stylex.create({
  column: { inlineSize: '480px' },
});

function Weekdays(props: Partial<ChartRootProps>) {
  return (
    <div {...stylex.props(styles.column)}>
      <Chart.Root definition={weekdayChart} height={240} {...(props as object)}>
        <Chart.Caption>Requests per weekday</Chart.Caption>
        <Chart.Plot />
      </Chart.Root>
    </div>
  );
}

const plotOf = (container: Element) => container.querySelector('svg') as SVGSVGElement;
const drawn = async (container: Element) => {
  await expect.poll(() => plotOf(container).querySelectorAll('rect').length).toBeGreaterThan(0);
  return plotOf(container);
};
const labels = (plot: SVGSVGElement) => [...plot.querySelectorAll('text')];
const label = (plot: SVGSVGElement, text: string) => labels(plot).find((node) => node.textContent === text) as SVGTextElement;

for (const mode of themes) {
  test(`the canonical bar chart renders and passes axe in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(
      <main>
        <Weekdays />
      </main>,
    );
    const plot = await drawn(screen.container);
    expect(plot.querySelectorAll('rect')).toHaveLength(weekdays.length);
    expect(await violations()).toEqual([]);
  });
}

test('the figure and the plot are both named by the caption', async () => {
  const screen = await render(<Weekdays />);
  const figure = screen.getByRole('figure', { name: 'Requests per weekday', exact: true });
  await expect.element(figure).toBeVisible();
  expect(figure.element().tagName).toBe('FIGURE');
  const caption = figure.element().querySelector('figcaption') as HTMLElement;
  const plot = screen.getByRole('img', { name: 'Requests per weekday', exact: true });
  await expect.element(plot).toHaveAttribute('aria-roledescription', 'chart');
  await expect.element(plot).toHaveAttribute('aria-labelledby', caption.id);
  expect(figure.element().getAttribute('aria-labelledby')).toBe(caption.id);
  expect(figure.element().contains(plot.element())).toBe(true);
});

test('the plot draws the bars, rules and labels of the scene, in proportion to the data', async () => {
  const screen = await render(<Weekdays />);
  const plot = await drawn(screen.container);

  const heights = [...plot.querySelectorAll('rect')].map((rect) => Number(rect.getAttribute('height')));
  const perRequest = (heights[0] as number) / weekdays[0]!.requests;
  heights.forEach((height, index) => expect(height).toBeCloseTo(weekdays[index]!.requests * perRequest, 6));

  const texts = labels(plot).map((node) => node.textContent);
  for (const { day } of weekdays) expect(texts).toContain(day);
  expect(texts).toContain('Day');
  expect(texts).toContain('100000');
  // Gridlines, the two baselines and the tick stubs are all rules.
  expect(plot.querySelectorAll('line').length).toBeGreaterThan(weekdays.length);
  // The scene's focus layer is the item's to draw, and nothing draws it yet.
  expect(plot.querySelectorAll('circle')).toHaveLength(0);
});

test('nothing from the scene paint, its class names or its --ts-chart variables reaches the DOM', async () => {
  const themed = defineChart(
    {
      marks: [barY(weekdays, { x: 'day', y: 'requests' })],
      scales: { x: { scale: scaleBand }, y: { scale: scaleLinear } },
      theme: { palette: ['#ff0000'], foreground: '#00ff00', grid: '#0000ff' },
    },
    { focusRing: false, keyboard: false, svgAnimation: { duration: 400 } },
  );
  const screen = await render(<Weekdays definition={themed} />);
  const plot = await drawn(screen.container);
  const markup = plot.outerHTML;
  expect(markup).not.toMatch(/ts-chart/);
  expect(markup).not.toMatch(/currentColor|#ff0000|#00ff00|#0000ff/i);
  for (const node of plot.querySelectorAll('*')) {
    for (const attribute of ['fill', 'stroke', 'style', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-width']) {
      expect(node.hasAttribute(attribute), `${node.tagName} has no ${attribute} attribute`).toBe(false);
    }
  }
  expect(plot.querySelectorAll('animate, animateTransform')).toHaveLength(0);
});

test('bars take the series tokens by color group, wrapping after six, and guides take the guide tokens', async () => {
  const rows = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((group, index) => ({ group, value: index + 1 }));
  const grouped = defineChart({
    marks: [barY(rows, { x: 'group', y: 'value', color: 'group' })],
    scales: { x: { scale: scaleBand, axis: { label: 'Group' } }, y: { scale: scaleLinear, nice: true, grid: true } },
  });
  const screen = await render(<Weekdays definition={grouped} />);
  const plot = await drawn(screen.container);

  const fills = [...plot.querySelectorAll('rect')].map((rect) => getComputedStyle(rect).fill);
  const series = [1, 2, 3, 4, 5, 6, 1].map((n) => tokenValue('fill', `var(--ult-color-series-${n})`));
  expect(fills).toEqual(series);

  for (const line of plot.querySelectorAll('line')) expect(getComputedStyle(line).stroke).toBe(tokenValue('stroke', 'var(--ult-color-border)'));
  expect(getComputedStyle(label(plot, '0')).fill).toBe(tokenValue('fill', 'var(--ult-color-text-subtle)'));
  expect(getComputedStyle(label(plot, 'a')).fill).toBe(tokenValue('fill', 'var(--ult-color-text-muted)'));
  expect(getComputedStyle(label(plot, 'Group')).fill).toBe(tokenValue('fill', 'var(--ult-color-text-muted)'));
  for (const text of labels(plot)) expect(getComputedStyle(text).fontSize).toBe(tokenValue('font-size', 'var(--ult-text-3)'));
});

test('height is the plot’s one inline size, and the scene fills the measured width', async () => {
  const screen = await render(<Weekdays />);
  const plot = await drawn(screen.container);
  expect(plot.getAttribute('style')).toBe('height: 240px;');
  const box = plot.getBoundingClientRect();
  expect(box.width).toBe(480);
  expect(box.height).toBe(240);
  const right = Math.max(...[...plot.querySelectorAll('rect')].map((rect) => Number(rect.getAttribute('x')) + Number(rect.getAttribute('width'))));
  expect(right).toBeLessThanOrEqual(480);
  expect(right).toBeGreaterThan(400);
});

test('aspectRatio sizes the plot from its width, and a resize compiles the scene again', async () => {
  const screen = await render(<Weekdays aspectRatio={2} height={undefined} />);
  const plot = await drawn(screen.container);
  expect(plot.getAttribute('style')).toBe('aspect-ratio: 2 / 1;');
  expect(plot.getBoundingClientRect().height).toBe(240);
  const lastBar = () => {
    const rect = [...plot.querySelectorAll('rect')].at(-1) as SVGRectElement;
    return Number(rect.getAttribute('x')) + Number(rect.getAttribute('width'));
  };
  const before = lastBar();
  (plot.parentElement?.parentElement as HTMLElement).style.inlineSize = '320px';
  await expect.poll(() => plot.getBoundingClientRect().height).toBe(160);
  await expect.poll(lastBar).toBeLessThan(before);
  expect(lastBar()).toBeLessThanOrEqual(320);
});

test('the plot takes no focus yet', async () => {
  const screen = await render(
    <>
      <Weekdays />
      <button type="button">After</button>
    </>,
  );
  await drawn(screen.container);
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }).element());
  expect(plotOf(screen.container).hasAttribute('tabindex')).toBe(false);
});

test('render reaches Root and Caption', async () => {
  const screen = await render(
    <Chart.Root definition={weekdayChart} height={120} render={<div data-testid="root" />}>
      <Chart.Caption render={<p />}>Requests</Chart.Caption>
      <Chart.Plot />
    </Chart.Root>,
  );
  const root = screen.getByTestId('root').element();
  expect(root.tagName).toBe('DIV');
  const caption = root.querySelector('p') as HTMLElement;
  expect(root.getAttribute('aria-labelledby')).toBe(caption.id);
});

test('public prop types: one of height or aspectRatio, the style slot, no className, and no render on Plot', () => {
  type Definition = { definition: typeof weekdayChart };
  expectTypeOf<Definition & { height: number }>().toExtend<ChartRootProps>();
  expectTypeOf<Definition & { aspectRatio: number }>().toExtend<ChartRootProps>();
  expectTypeOf<Definition & { height: number; aspectRatio: number }>().not.toExtend<ChartRootProps>();
  expectTypeOf<Definition>().not.toExtend<ChartRootProps>();
  expectTypeOf<ChartRootProps>().toHaveProperty('definition');
  expectTypeOf<ChartRootProps>().toHaveProperty('render');
  expectTypeOf<ChartCaptionProps>().toHaveProperty('render');
  expectTypeOf<ChartPlotProps>().not.toHaveProperty('render');
  for (const part of [{} as ChartRootProps, {} as ChartCaptionProps, {} as ChartPlotProps]) {
    expectTypeOf(part).not.toHaveProperty('className');
    expectTypeOf(part).toHaveProperty('style');
  }
  expectTypeOf<ChartRootProps>().not.toHaveProperty('variant');
  expectTypeOf<ChartRootProps>().not.toHaveProperty('size');
  expectTypeOf<ChartRootProps>().not.toHaveProperty('tone');
});
