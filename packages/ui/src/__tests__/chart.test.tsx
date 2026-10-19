import * as stylex from '@stylexjs/stylex';
import { areaY } from '@tanstack/charts/area';
import { barY } from '@tanstack/charts/bar';
import { lineY } from '@tanstack/charts/line';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { defineChart } from '@tanstack/charts/scene';
import { stackRowsY } from '@tanstack/charts/transform/stack';
import type { ChartPoint } from '@tanstack/charts/types';
import {
  Chart,
  type ChartCaptionProps,
  type ChartLegendProps,
  type ChartPlotProps,
  type ChartRootProps,
  type ChartTooltipProps,
  useChart,
} from '@ultima/ui';
import { expect, expectTypeOf, test, vi } from 'vitest';
import { useState } from 'react';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { themeDocument, themes, violations } from './axe';
import { tokenValue } from './token-value';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: no axes; the canonical bar chart, a two-series line with its legend
 *    and a stacked area render in both color modes, sized by `height` or by `aspectRatio`.
 * 2. The name resolves: the figure is named by its caption, and the plot is `role="img"` with
 *    `aria-roledescription="chart"`, labelled by the same caption.
 * 3. The focus ring lands where the contract says: the plot is one Tab stop with the system ring on
 *    :focus-visible, and the active point carries the border-focus marker.
 * 4. The primitive is still wired: no primitive; `useRender` carries `render` and `ref` on Root,
 *    Caption and Tooltip, and the scene comes from `createChartRuntime` at the plot's measured size.
 * 5. Documented state drives its style: none; Chart has no data-* state.
 * 6. Typecheck passes: `height` and `aspectRatio` are mutually exclusive, className is rejected,
 *    and Plot takes no `render`.
 * 7. Behavior this component wires itself: the plot draws the scene's bars, lines, areas, dots, rules
 *    and labels from tokens by color group, with no `ts-chart` class or scene paint string, and the
 *    definition's own theme, tooltip, keyboard, focus ring and animation ignored; the legend lists
 *    one swatch and label per color group and takes no focus. The keyboard moves a controllable
 *    active point, the status region announces it, and the tooltip shows it. Pointer hover is the
 *    docs demo's browser test, apps/docs/src/__tests__/chart.test.tsx.
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
  unbounded: { maxWidth: 'none' },
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
  await expect.poll(() => plotOf(container).querySelectorAll('rect, polyline, polygon').length).toBeGreaterThan(0);
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
  // The scene's focus layer is not drawn: the item draws its own marker, and only on an active point.
  expect(plot.querySelectorAll('circle')).toHaveLength(0);
});

test('nothing from the scene paint, its class names or its --ts-chart variables reaches the DOM', async () => {
  const themed = defineChart(
    {
      marks: [barY(weekdays, { x: 'day', y: 'requests' }), lineY(weekdays, { x: 'day', y: 'requests', stroke: '#ff00ff', points: true })],
      scales: { x: { scale: scaleBand }, y: { scale: scaleLinear } },
      theme: { palette: ['#ff0000'], foreground: '#00ff00', grid: '#0000ff' },
    },
    { focusRing: false, keyboard: false, svgAnimation: { duration: 400 } },
  );
  const screen = await render(<Weekdays definition={themed} />);
  const plot = await drawn(screen.container);
  const markup = plot.outerHTML;
  expect(markup).not.toMatch(/ts-chart/);
  expect(plot.querySelectorAll('polyline, circle')).not.toHaveLength(0);
  expect(markup).not.toMatch(/currentColor|#ff0000|#00ff00|#0000ff|#ff00ff/i);
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

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const traffic = months.flatMap((month, index) => [
  { month, source: 'Web', visits: 120 + index * 10 },
  { month, source: 'API', visits: 80 + index * 6 },
]);
const pointScales = { x: { scale: scalePoint }, y: { scale: scaleLinear, nice: true, grid: true } } as const;
const lineChart = defineChart({
  marks: [lineY(traffic, { x: 'month', y: 'visits', color: 'source', points: true })],
  scales: pointScales,
});
const areaChart = defineChart({
  marks: [areaY(stackRowsY(traffic, { x: 'month', y: 'visits', z: 'source' }), { x: 'x', y1: 'y1', y2: 'y2', color: 'z' })],
  scales: pointScales,
});

function Traffic({ definition }: { definition: ChartRootProps['definition'] }) {
  return (
    <div {...stylex.props(styles.column)}>
      <Chart.Root definition={definition} height={240}>
        <Chart.Caption>Visits by source</Chart.Caption>
        <Chart.Plot />
        <Chart.Legend />
      </Chart.Root>
    </div>
  );
}

const seriesToken = (property: string, n: number) => tokenValue(property, `var(--ult-color-series-${n})`);
const coordinates = (element: Element) =>
  (element.getAttribute('points') as string).trim().split(/\s+/).map((pair) => pair.split(',').map(Number) as [number, number]);
const legendItems = (container: Element) => [...container.querySelectorAll('ul > li')] as HTMLLIElement[];

for (const mode of themes) {
  test(`a two-series line with its legend and a stacked area pass axe in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(
      <main>
        <Traffic definition={lineChart} />
        <Traffic definition={areaChart} />
      </main>,
    );
    await expect.poll(() => screen.container.querySelectorAll('polyline, polygon').length).toBe(4);
    await expect.poll(() => legendItems(screen.container).length).toBe(4);
    expect(await violations()).toEqual([]);
  });
}

test('a two-series line draws each group as a line with a dot per point, in its series token', async () => {
  const screen = await render(<Traffic definition={lineChart} />);
  const plot = plotOf(screen.container);
  await expect.poll(() => plot.querySelectorAll('polyline').length).toBe(2);

  const lines = [...plot.querySelectorAll('polyline')];
  lines.forEach((line, index) => {
    const style = getComputedStyle(line);
    expect(style.stroke).toBe(seriesToken('stroke', index + 1));
    expect(style.fill).toBe('none');
    expect(style.strokeWidth).toBe('2px');
    expect(coordinates(line)).toHaveLength(months.length);
  });
  // Web sits above API in every month, and a larger value is drawn higher up.
  const [web, api] = lines.map(coordinates) as [[number, number][], [number, number][]];
  web.forEach(([x, y], index) => {
    expect(x).toBeCloseTo(api[index]![0], 6);
    expect(y).toBeLessThan(api[index]![1]);
  });

  const dots = [...plot.querySelectorAll('circle')];
  expect(dots).toHaveLength(traffic.length);
  const fills = dots.map((dot) => getComputedStyle(dot).fill);
  expect(fills.filter((fill) => fill === seriesToken('fill', 1))).toHaveLength(months.length);
  expect(fills.filter((fill) => fill === seriesToken('fill', 2))).toHaveLength(months.length);
  const webDots = dots.filter((dot) => getComputedStyle(dot).fill === seriesToken('fill', 1));
  webDots.forEach((dot, index) => {
    expect(Number(dot.getAttribute('cx'))).toBeCloseTo(web[index]![0], 6);
    expect(Number(dot.getAttribute('cy'))).toBeCloseTo(web[index]![1], 6);
  });
});

test('a stacked area draws one solid band per group, each resting on the one below', async () => {
  const screen = await render(<Traffic definition={areaChart} />);
  const plot = plotOf(screen.container);
  await expect.poll(() => plot.querySelectorAll('polygon').length).toBe(2);

  const bands = [...plot.querySelectorAll('polygon')];
  bands.forEach((band, index) => {
    const style = getComputedStyle(band);
    expect(style.fill).toBe(seriesToken('fill', index + 1));
    expect(style.fillOpacity).toBe('1');
    expect(style.stroke).toBe('none');
  });
  // A band's ring runs along its top edge and back along its base, one point per month each way.
  const [web, api] = bands.map(coordinates) as [[number, number][], [number, number][]];
  expect(web).toHaveLength(months.length * 2);
  const webTop = web.slice(0, months.length);
  const apiBase = api.slice(months.length).reverse();
  apiBase.forEach(([x, y], index) => {
    expect(x).toBeCloseTo(webTop[index]![0], 6);
    expect(y).toBeCloseTo(webTop[index]![1], 6);
  });
  // The stack's top is the two series' sum, so it rises above either series alone.
  expect(Math.min(...api.map(([, y]) => y))).toBeLessThan(Math.min(...webTop.map(([, y]) => y)));
});

test('a seventh group wraps to series 1, in the lines and in the legend', async () => {
  const groups = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const rows = groups.flatMap((group, index) => months.map((month) => ({ month, group, value: index + 1 })));
  const seven = defineChart({ marks: [lineY(rows, { x: 'month', y: 'value', color: 'group' })], scales: pointScales });
  const screen = await render(<Traffic definition={seven} />);
  const plot = plotOf(screen.container);
  await expect.poll(() => plot.querySelectorAll('polyline').length).toBe(groups.length);
  await expect.poll(() => legendItems(screen.container).length).toBe(groups.length);

  const wrapped = [1, 2, 3, 4, 5, 6, 1];
  expect([...plot.querySelectorAll('polyline')].map((line) => getComputedStyle(line).stroke)).toEqual(wrapped.map((n) => seriesToken('stroke', n)));
  const swatches = legendItems(screen.container).map((item) => item.querySelector('[aria-hidden="true"]') as HTMLElement);
  expect(swatches.map((swatch) => getComputedStyle(swatch).backgroundColor)).toEqual(wrapped.map((n) => seriesToken('background-color', n)));
});

test('the legend lists one swatch and text label per color group, and takes no focus', async () => {
  const screen = await render(
    <>
      <Traffic definition={lineChart} />
      <button type="button">After</button>
    </>,
  );
  const list = screen.getByRole('list');
  await expect.poll(() => legendItems(screen.container).map((item) => item.textContent)).toEqual(['Web', 'API']);
  expect(list.element().tagName).toBe('UL');
  expect(screen.container.querySelector('figure')?.contains(list.element())).toBe(true);

  legendItems(screen.container).forEach((item, index) => {
    const swatch = item.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(getComputedStyle(swatch).backgroundColor).toBe(seriesToken('background-color', index + 1));
    expect(getComputedStyle(item).color).toBe(tokenValue('color', 'var(--ult-color-text-muted)'));
  });

  await userEvent.tab();
  expect(document.activeElement).toBe(plotOf(screen.container));
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }).element());
  expect(list.element().querySelectorAll('[tabindex], button, a, input')).toHaveLength(0);
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

const status = (container: Element) => container.querySelector('[role="status"]') as HTMLElement;
const marker = (plot: SVGSVGElement) => plot.parentElement?.querySelector(':scope > span[aria-hidden="true"]') as HTMLElement | null;
const press = async (...keys: string[]) => {
  for (const key of keys) await userEvent.keyboard(`{${key}}`);
};
const focusPlot = async (container: Element) => {
  const plot = await drawn(container);
  await userEvent.tab();
  expect(document.activeElement).toBe(plot);
  return plot;
};

test('the plot is one Tab stop with the focus ring, focus alone activates nothing, and leaving clears the point', async () => {
  const onActiveChange = vi.fn();
  const screen = await render(
    <>
      <Weekdays onActiveChange={onActiveChange} />
      <button type="button">After</button>
    </>,
  );
  const plot = await focusPlot(screen.container);
  expect(getComputedStyle(plot).outlineStyle).toBe('solid');
  expect(getComputedStyle(plot).outlineColor).toBe(tokenValue('outline-color', 'var(--ult-color-border-focus)'));
  expect(getComputedStyle(plot).outlineWidth).toBe('2px');
  expect(getComputedStyle(plot).outlineOffset).toBe('2px');
  expect(marker(plot)).toBeNull();
  expect(status(screen.container).textContent).toBe('');
  expect(onActiveChange).not.toHaveBeenCalled();
  await press('ArrowRight');
  expect(marker(plot)).not.toBeNull();
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }).element());
  expect(onActiveChange).toHaveBeenLastCalledWith(null);
  expect(marker(plot)).toBeNull();
});

test('the status region is mounted empty beside the plot, and holds the formatted point once one is active', async () => {
  const screen = await render(<Weekdays />);
  const region = status(screen.container);
  expect(region.tagName).toBe('SPAN');
  expect(region.getAttribute('aria-atomic')).toBe('true');
  expect(region.textContent).toBe('');
  expect(getComputedStyle(region).clipPath).toBe('inset(50%)');
  const plot = await focusPlot(screen.container);
  expect(region.previousElementSibling).toBe(plot);
  await press('ArrowRight');
  expect(region.textContent).toBe('Mon, 84200');
});

test('Right and Left walk the series in x order from the first point, and Home and End reach its ends', async () => {
  const screen = await render(<Weekdays />);
  await focusPlot(screen.container);
  const said = () => status(screen.container).textContent;
  await press('ArrowRight');
  expect(said()).toBe('Mon, 84200');
  await press('ArrowRight');
  expect(said()).toBe('Tue, 91700');
  await press('ArrowLeft');
  expect(said()).toBe('Mon, 84200');
  await press('ArrowLeft');
  expect(said()).toBe('Mon, 84200');
  await press('End');
  expect(said()).toBe('Sun, 38900');
  await press('ArrowRight');
  expect(said()).toBe('Sun, 38900');
  await press('Home');
  expect(said()).toBe('Mon, 84200');
});

test('Left, Home and End also start the walk when nothing is active', async () => {
  for (const [key, text] of [
    ['ArrowLeft', 'Mon, 84200'],
    ['Home', 'Mon, 84200'],
    ['End', 'Sun, 38900'],
  ]) {
    const screen = await render(<Weekdays />);
    await focusPlot(screen.container);
    await press(key as string);
    expect(status(screen.container).textContent, key).toBe(text);
    await screen.unmount();
  }
});

test('Escape clears the active point, and Enter and Space do nothing', async () => {
  const onActiveChange = vi.fn();
  const screen = await render(<Weekdays onActiveChange={onActiveChange} />);
  const plot = await focusPlot(screen.container);
  await press('ArrowRight', 'ArrowRight');
  expect(onActiveChange).toHaveBeenCalledTimes(2);
  await press('Enter', ' ');
  expect(onActiveChange).toHaveBeenCalledTimes(2);
  expect(status(screen.container).textContent).toBe('Tue, 91700');
  await press('Escape');
  expect(onActiveChange).toHaveBeenLastCalledWith(null);
  expect(status(screen.container).textContent).toBe('');
  expect(marker(plot)).toBeNull();
  expect(document.activeElement).toBe(plot);
});

const bySource = ['Mon', 'Tue', 'Wed'].flatMap((day, index) => [
  { day, source: 'API', requests: 40 + index },
  { day, source: 'Web', requests: 20 + index },
]);
const stacked = defineChart({
  marks: [barY(bySource, { x: 'day', y: 'requests', color: 'source' })],
  scales: { x: { scale: scaleBand }, y: { scale: scaleLinear } },
});

test('Up and Down move to the same x in the next and previous series, and Home and End stay in the active one', async () => {
  const screen = await render(<Weekdays definition={stacked} />);
  await focusPlot(screen.container);
  const said = () => status(screen.container).textContent;
  await press('ArrowRight');
  expect(said()).toBe('API, Mon, 40');
  await press('ArrowDown');
  expect(said()).toBe('API, Mon, 40');
  await press('ArrowUp');
  expect(said()).toBe('Web, Mon, 20');
  await press('ArrowUp');
  expect(said()).toBe('Web, Mon, 20');
  await press('ArrowRight');
  expect(said()).toBe('Web, Tue, 21');
  await press('End');
  expect(said()).toBe('Web, Wed, 22');
  await press('ArrowDown');
  expect(said()).toBe('API, Wed, 42');
  await press('Home');
  expect(said()).toBe('API, Mon, 40');
});

test('on a two-series line the keys walk one line and Up and Down cross to the other, naming its series', async () => {
  const screen = await render(<Weekdays definition={lineChart} />);
  await focusPlot(screen.container);
  const said = () => status(screen.container).textContent;
  await press('ArrowRight');
  expect(said()).toBe('Web, Jan, 120');
  await press('ArrowRight');
  expect(said()).toBe('Web, Feb, 130');
  await press('ArrowUp');
  expect(said()).toBe('API, Feb, 86');
  await press('End');
  expect(said()).toBe('API, Jun, 110');
});

test('formatPoint is the announcement, and a repeated text still announces', async () => {
  const screen = await render(<Weekdays formatPoint={(point) => (Number(point.yValue) > 80_000 ? 'Busy' : 'Quiet')} />);
  await focusPlot(screen.container);
  const said = () => status(screen.container).textContent;
  await press('ArrowRight');
  expect(said()).toBe('Busy');
  await press('ArrowRight');
  expect(said()).toBe('Busy⁠');
  await press('ArrowRight');
  expect(said()).toBe('Busy');
  await press('End');
  expect(said()).toBe('Quiet');
});

test('the default text reads values through the axis formats', async () => {
  const thousands = defineChart({
    marks: [barY(weekdays, { x: 'day', y: 'requests' })],
    scales: {
      x: { scale: scaleBand, axis: { ticks: { format: (day: string) => day.toUpperCase() } } },
      y: { scale: scaleLinear, axis: { ticks: { format: (value: number) => `${value / 1000}k` } } },
    },
  });
  const screen = await render(<Weekdays definition={thousands} />);
  await focusPlot(screen.container);
  await press('ArrowRight');
  expect(status(screen.container).textContent).toBe('MON, 84.2k');
});

test('the active point carries a border-focus ring over a page-colored disc, at the point', async () => {
  const onActiveChange = vi.fn();
  const screen = await render(<Weekdays onActiveChange={onActiveChange} />);
  const plot = await focusPlot(screen.container);
  await press('ArrowRight', 'ArrowRight');
  const point = onActiveChange.mock.lastCall?.[0] as ChartPoint;
  const ring = marker(plot) as HTMLElement;
  const box = ring.getBoundingClientRect();
  const origin = plot.getBoundingClientRect();
  expect(box.left + box.width / 2 - origin.left).toBeCloseTo(point.x, 0);
  expect(box.top + box.height / 2 - origin.top).toBeCloseTo(point.y, 0);
  expect(box.width).toBe(10);
  expect(box.height).toBe(10);
  const paint = getComputedStyle(ring);
  expect(paint.borderTopColor).toBe(tokenValue('border-color', 'var(--ult-color-border-focus)'));
  expect(paint.backgroundColor).toBe(tokenValue('background-color', 'var(--ult-color-surface)'));
  expect(paint.borderTopWidth).toBe('2px');
  expect(paint.borderRadius).toBe(tokenValue('border-radius', 'var(--ult-radius-full)'));
  expect(paint.pointerEvents).toBe('none');
});

function Controlled({ onActiveChange }: { onActiveChange: (point: ChartPoint | null) => void }) {
  const [active, setActive] = useState<ChartPoint | null>(null);
  return (
    <Weekdays
      active={active}
      onActiveChange={(point) => {
        onActiveChange(point);
        if (point?.xValue !== 'Wed') setActive(point);
      }}
    />
  );
}

test('a controlled active point moves only when the owner takes the change', async () => {
  const onActiveChange = vi.fn();
  const screen = await render(<Controlled onActiveChange={onActiveChange} />);
  await focusPlot(screen.container);
  await press('ArrowRight', 'ArrowRight');
  expect(status(screen.container).textContent).toBe('Tue, 91700');
  await press('ArrowRight');
  expect((onActiveChange.mock.lastCall?.[0] as ChartPoint).xValue).toBe('Wed');
  expect(status(screen.container).textContent).toBe('Tue, 91700');
});

function Readout() {
  const { scene, active, setActive } = useChart();
  return (
    <button type="button" onClick={() => setActive(scene?.points.at(-1) ?? null)}>
      {active ? `${String(active.xValue)} active` : 'None active'}
    </button>
  );
}

test('useChart reads and sets the active point from a part of the consumer’s own', async () => {
  const screen = await render(
    <div {...stylex.props(styles.column)}>
      <Chart.Root definition={weekdayChart} height={240}>
        <Chart.Caption>Requests per weekday</Chart.Caption>
        <Chart.Plot />
        <Readout />
      </Chart.Root>
    </div>,
  );
  await drawn(screen.container);
  const readout = screen.getByRole('button');
  await expect.element(readout).toHaveTextContent('None active');
  await readout.click();
  await expect.element(readout).toHaveTextContent('Sun active');
  expect(status(screen.container).textContent).toBe('Sun, 38900');
});

test('defaultActive seeds the active point, matched by key in the scene the plot draws', async () => {
  const onActiveChange = vi.fn();
  const first = await render(<Weekdays onActiveChange={onActiveChange} />);
  await focusPlot(first.container);
  await press('End');
  const sunday = onActiveChange.mock.lastCall?.[0] as ChartPoint;
  await first.unmount();
  const seeded = await render(<Weekdays defaultActive={{ ...sunday }} />);
  await expect.poll(() => status(seeded.container).textContent).toBe('Sun, 38900');
  expect(marker(plotOf(seeded.container))).not.toBeNull();
});

function Outside() {
  useChart();
  return null;
}

test('useChart throws outside Chart.Root', async () => {
  await expect(render(<Outside />)).rejects.toThrowError('useChart must be used inside Chart.Root.');
});

function Explored(props: Partial<ChartTooltipProps>) {
  return (
    <div {...stylex.props(styles.column)}>
      <Chart.Root definition={weekdayChart} height={240}>
        <Chart.Caption>Requests per weekday</Chart.Caption>
        <Chart.Plot />
        <Chart.Tooltip {...props} />
      </Chart.Root>
    </div>
  );
}

test('the tooltip shows the active point’s text above it, hidden from assistive technology, in Tooltip’s popup tokens', async () => {
  const screen = await render(<Explored />);
  const plot = await focusPlot(screen.container);
  const figure = screen.container.querySelector('figure') as HTMLElement;
  expect(figure.querySelectorAll(':scope > div')).toHaveLength(0);
  await press('ArrowRight', 'ArrowRight');
  const tooltip = figure.querySelector(':scope > div') as HTMLElement;
  expect(tooltip.textContent).toBe('Tue, 91700');
  expect(tooltip.getAttribute('aria-hidden')).toBe('true');
  const paint = getComputedStyle(tooltip);
  expect(paint.backgroundColor).toBe(tokenValue('background-color', 'var(--ult-color-surface-raised)'));
  expect(paint.borderTopColor).toBe(tokenValue('border-color', 'var(--ult-color-border)'));
  expect(paint.borderRadius).toBe(tokenValue('border-radius', 'var(--ult-radius-sm)'));
  expect(paint.boxShadow).toBe(tokenValue('box-shadow', 'var(--ult-shadow-sm)'));
  expect(paint.fontSize).toBe(tokenValue('font-size', 'var(--ult-text-2)'));
  expect(paint.pointerEvents).toBe('none');

  const ring = (marker(plot) as HTMLElement).getBoundingClientRect();
  const box = tooltip.getBoundingClientRect();
  const center = ring.left + ring.width / 2;
  expect(box.left).toBeLessThan(center);
  expect(box.right).toBeGreaterThan(center);
  expect(ring.top + ring.height / 2 - box.bottom).toBeCloseTo(12, 0);

  await press('End');
  const end = tooltip.getBoundingClientRect();
  expect(end.right).toBeLessThanOrEqual(plot.getBoundingClientRect().right);
  await press('Escape');
  expect(figure.querySelectorAll(':scope > div')).toHaveLength(0);
});

test('render and style reach the tooltip', async () => {
  const screen = await render(<Explored render={<p data-testid="tooltip" />} style={styles.unbounded} />);
  await focusPlot(screen.container);
  await press('ArrowRight');
  const tooltip = screen.getByTestId('tooltip').element();
  expect(tooltip.tagName).toBe('P');
  expect(getComputedStyle(tooltip).maxWidth).toBe('none');
});

for (const mode of themes) {
  test(`a chart with an active point and its tooltip passes axe in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(
      <main>
        <Explored />
      </main>,
    );
    await focusPlot(screen.container);
    await press('ArrowRight');
    expect(await violations()).toEqual([]);
  });
}

test('render reaches Root, Caption and Legend', async () => {
  const screen = await render(
    <Chart.Root definition={lineChart} height={120} render={<div data-testid="root" />}>
      <Chart.Caption render={<p />}>Requests</Chart.Caption>
      <Chart.Plot />
      <Chart.Legend render={<ol />} />
    </Chart.Root>,
  );
  const root = screen.getByTestId('root').element();
  expect(root.tagName).toBe('DIV');
  const caption = root.querySelector('p') as HTMLElement;
  expect(root.getAttribute('aria-labelledby')).toBe(caption.id);
  await expect.poll(() => root.querySelectorAll('ol > li').length).toBe(2);
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
  expectTypeOf<ChartLegendProps>().toHaveProperty('render');
  expectTypeOf<ChartPlotProps>().not.toHaveProperty('render');
  expectTypeOf<ChartTooltipProps>().toHaveProperty('render');
  expectTypeOf<ChartRootProps['active']>().toEqualTypeOf<ChartPoint | null | undefined>();
  expectTypeOf<ChartRootProps['formatPoint']>().toEqualTypeOf<((point: ChartPoint) => string) | undefined>();
  for (const part of [{} as ChartRootProps, {} as ChartCaptionProps, {} as ChartPlotProps, {} as ChartTooltipProps, {} as ChartLegendProps]) {
    expectTypeOf(part).not.toHaveProperty('className');
    expectTypeOf(part).toHaveProperty('style');
  }
  expectTypeOf<ChartRootProps>().not.toHaveProperty('variant');
  expectTypeOf<ChartRootProps>().not.toHaveProperty('size');
  expectTypeOf<ChartRootProps>().not.toHaveProperty('tone');
});
