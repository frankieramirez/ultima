import { describe, expect, expectTypeOf, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import descriptor from '../../../../registry/metadata/block/dashboard-01.ts';
import { Dashboard01 } from '../dashboard-01/dashboard-01';
import { themeDocument, themes, viewports, violations } from './axe';

const cases = themes.flatMap((mode) => viewports.map((viewport) => ({ mode, viewport, name: `${mode.name}, ${viewport.name}` })));

async function mount({ mode, viewport }: (typeof cases)[number]) {
  await page.viewport(viewport.width, viewport.height);
  themeDocument(mode);
  return render(<Dashboard01 />);
}

type Screen = Awaited<ReturnType<typeof mount>>;

const texts = (elements: Iterable<Element>) => [...elements].map((element) => element.textContent?.trim() ?? '');

const section = (screen: Screen, name: string) => screen.getByRole('region', { name, exact: true });

const captions = (screen: Screen) => texts(section(screen, 'Key metrics').element().querySelectorAll('p'));

const products = (screen: Screen) =>
  [...section(screen, 'Top products').element().querySelectorAll('[role="meter"]')].map((meter) => ({
    name: meter.getAttribute('aria-labelledby') ? document.getElementById(meter.getAttribute('aria-labelledby') as string)?.textContent : null,
    value: meter.getAttribute('aria-valuenow'),
    text: meter.getAttribute('aria-valuetext'),
  }));

const chart = (screen: Screen) => section(screen, 'Revenue').element().querySelector('svg') as SVGSVGElement;

const orderRows = (screen: Screen) => texts(section(screen, 'Recent orders').element().querySelectorAll('tbody tr'));

describe.each(cases)('$name', (scenario) => {
  test('1. it mounts with no props', async () => {
    const screen = await mount(scenario);
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
  });

  test('2. its structure resolves', async () => {
    const screen = await mount(scenario);
    const root = screen.container;
    const narrow = scenario.viewport.name === 'narrow';

    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelectorAll('main')).toHaveLength(1);
    const main = screen.getByRole('main').element();
    const header = main.querySelector('header') as HTMLElement;
    expect(header.querySelector('h1')?.textContent).toBe('Overview');
    expect(document.querySelectorAll('[role="banner"]')).toHaveLength(0);
    expect(main.querySelector('aside')).toBeNull();

    const keyMetrics = section(screen, 'Key metrics').element();
    expect(keyMetrics.tagName).toBe('SECTION');
    expect(main.contains(keyMetrics)).toBe(true);
    for (const name of ['Revenue', 'Top products', 'Recent orders']) {
      const region = section(screen, name).element();
      expect(region.tagName).toBe('SECTION');
      expect(main.contains(region)).toBe(true);
      expect(region.querySelector('h2')?.textContent).toBe(name);
      expect(region.getAttribute('aria-labelledby')).toBe(region.querySelector('h2')?.id);
    }

    await expect.element(screen.getByRole('button', { name: 'Toggle navigation' })).toBeVisible();
    await expect.element(screen.getByRole('searchbox', { name: 'Search orders' })).toHaveAttribute('type', 'search');
    await expect.element(screen.getByRole('combobox', { name: 'Date range' })).toHaveTextContent('Last 30 days');
    await expect.element(screen.getByRole('button', { name: 'Export' })).toBeVisible();
    await expect.element(screen.getByRole('group', { name: 'Chart period' })).toBeVisible();
    for (const name of ['Day', 'Week', 'Month']) await expect.element(screen.getByRole('button', { name, exact: true })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Day', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect.element(screen.getByRole('button', { name: 'Show data' })).toHaveAttribute('aria-expanded', 'false');
    await expect.element(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '#orders');
    expect(section(screen, 'Top products').element().querySelectorAll('[role="meter"]')).toHaveLength(5);

    if (narrow) {
      expect(document.querySelectorAll('nav')).toHaveLength(0);
      await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));
    }
    const nav = page.getByRole('navigation', { name: 'Workspace' });
    await expect.element(nav).toBeVisible();
    expect(document.querySelectorAll('nav')).toHaveLength(1);
    expect(nav.element().closest('main')).toBeNull();
    await expect.element(nav.getByRole('button', { name: 'Northwind Pro plan' })).toHaveAttribute('aria-haspopup', 'menu');
    await expect.element(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    await expect.element(nav.getByRole('link', { name: 'Orders, 12' })).toHaveAttribute('href', '#orders');
    for (const name of ['Products', 'Customers', 'Analytics', 'Campaigns', 'Settings', 'Help']) {
      await expect.element(nav.getByRole('link', { name })).toBeVisible();
    }
    const user = [...nav.element().querySelectorAll('span')].find((span) => span.textContent === 'Ada Kim')?.parentElement?.parentElement as HTMLElement;
    expect(user.querySelector('[aria-hidden="true"]')?.textContent).toBe('AK');
    expect(user.querySelector('a, button')).toBeNull();
    expect(user.textContent).toBe('AKAda Kimada@northwind.co');

    if (narrow) {
      await userEvent.keyboard('{Escape}');
      await expect.element(nav).not.toBeInTheDocument();
      const columns = getComputedStyle(keyMetrics).gridTemplateColumns.split(' ');
      expect(columns).toHaveLength(2);
      const [revenue, top] = ['Revenue', 'Top products'].map((name) => section(screen, name).element().getBoundingClientRect());
      expect((revenue as DOMRect).bottom).toBeLessThanOrEqual((top as DOMRect).top);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(scenario.viewport.width);
      const scroller = screen.getByRole('region', { name: 'Recent orders table' }).element();
      expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    } else {
      expect(getComputedStyle(keyMetrics).gridTemplateColumns.split(' ')).toHaveLength(4);
      const [revenue, top] = ['Revenue', 'Top products'].map((name) => section(screen, name).element().getBoundingClientRect());
      expect((revenue as DOMRect).right).toBeLessThanOrEqual((top as DOMRect).left);
    }
  });

  test('3. axe passes', async () => {
    const screen = await mount(scenario);
    expect(await violations()).toEqual([]);
    if (scenario.viewport.name === 'narrow') {
      await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));
      await expect.element(page.getByRole('navigation', { name: 'Workspace' })).toBeVisible();
      // axe reads a link still sliding in from off screen as a skip link, so let the menu settle first.
      await Promise.all(document.getAnimations().map((animation) => animation.finished));
      expect(await violations()).toEqual([]);
    }
  });
});

describe('4. the behavior the block wires', () => {
  test('the range Select changes the stats, their captions and the products, and not the chart or the orders', async () => {
    const screen = await render(<Dashboard01 />);
    const revenue = section(screen, 'Key metrics').getByText('$48,210');
    await expect.element(revenue).toBeVisible();
    expect(captions(screen)).toEqual(Array(4).fill('vs. previous 30 days'));
    const before = { products: products(screen), bars: chart(screen).querySelectorAll('rect').length, orders: orderRows(screen) };
    expect(before.products[0]).toEqual({ name: 'Linen throw', value: '9420', text: '$9,420' });

    await userEvent.click(screen.getByRole('combobox', { name: 'Date range' }));
    await userEvent.click(page.getByRole('option', { name: 'Last 7 days' }));

    await expect.element(screen.getByRole('combobox', { name: 'Date range' })).toHaveTextContent('Last 7 days');
    await expect.element(section(screen, 'Key metrics').getByText('$11,640')).toBeVisible();
    expect(captions(screen)).toEqual(Array(4).fill('vs. previous 7 days'));
    const metrics = section(screen, 'Key metrics').element().textContent ?? '';
    for (const value of ['302', '−1.6%', '2,318', '0.6%', '−0.1%']) expect(metrics).toContain(value);
    expect(products(screen)).not.toEqual(before.products);
    expect(products(screen)[0]).toEqual({ name: 'Linen throw', value: '2240', text: '$2,240' });
    expect(chart(screen).querySelectorAll('rect')).toHaveLength(before.bars);
    expect(orderRows(screen)).toEqual(before.orders);

    await userEvent.click(screen.getByRole('combobox', { name: 'Date range' }));
    await userEvent.click(page.getByRole('option', { name: 'Last 90 days' }));
    await expect.element(section(screen, 'Key metrics').getByText('$139,870')).toBeVisible();
    expect(captions(screen)).toEqual(Array(4).fill('vs. previous 90 days'));
    expect(products(screen)[0]).toEqual({ name: 'Oak side table', value: '9860', text: '$9,860' });
  });

  test("the period Toggle Group changes the chart's window, its subtitle and the disclosed Table, and the pressed item stays pressed", async () => {
    const screen = await render(<Dashboard01 />);
    const revenue = section(screen, 'Revenue');
    await expect.element(revenue.getByText('Daily, last 14 days')).toBeVisible();
    expect(chart(screen).querySelectorAll('rect')).toHaveLength(14);
    await userEvent.click(screen.getByRole('button', { name: 'Show data' }));
    await expect.element(revenue.getByRole('table')).toBeVisible();
    expect(revenue.element().querySelector('caption')?.textContent).toBe('Revenue by day');
    expect(revenue.element().querySelectorAll('tbody tr')).toHaveLength(14);

    const week = screen.getByRole('button', { name: 'Week', exact: true });
    await userEvent.click(week);
    await expect.element(revenue.getByText('Weekly, last 12 weeks')).toBeVisible();
    await expect.element(week).toHaveAttribute('aria-pressed', 'true');
    await expect.element(screen.getByRole('button', { name: 'Day', exact: true })).toHaveAttribute('aria-pressed', 'false');
    expect(chart(screen).querySelectorAll('rect')).toHaveLength(12);
    expect(revenue.element().querySelector('caption')?.textContent).toBe('Revenue by week');
    expect(texts(revenue.element().querySelectorAll('tbody tr td:first-child'))[0]).toBe('Jul 20');

    await userEvent.click(week);
    await expect.element(week).toHaveAttribute('aria-pressed', 'true');
    await expect.element(revenue.getByText('Weekly, last 12 weeks')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Month', exact: true }));
    await expect.element(revenue.getByText('Monthly, last 12 months')).toBeVisible();
    expect(revenue.element().querySelector('caption')?.textContent).toBe('Revenue by month');
    expect(texts(revenue.element().querySelectorAll('tbody tr td:first-child'))).toEqual(
      ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    );
  });

  test('Show data opens and closes the Table, and its label follows the state', async () => {
    const screen = await render(<Dashboard01 />);
    const revenue = section(screen, 'Revenue');
    const show = screen.getByRole('button', { name: 'Show data' });
    expect(revenue.element().querySelector('table')).toBeNull();

    await userEvent.click(show);
    const hide = screen.getByRole('button', { name: 'Hide data' });
    await expect.element(hide).toHaveAttribute('aria-expanded', 'true');
    await expect.element(revenue.getByRole('table')).toBeVisible();

    await userEvent.click(hide);
    await expect.element(screen.getByRole('button', { name: 'Show data' })).toHaveAttribute('aria-expanded', 'false');
    await expect.element(revenue.getByRole('table')).not.toBeInTheDocument();
  });

  test('search filters the orders by number or customer, case-insensitive, and says when nothing matches', async () => {
    const screen = await render(<Dashboard01 />);
    expect(orderRows(screen)).toHaveLength(8);
    expect(orderRows(screen)[0]).toMatch(/^#3021Mara Lindqvist/);
    const search = screen.getByRole('searchbox', { name: 'Search orders' });

    await userEvent.fill(search, 'THEO');
    await expect.poll(() => orderRows(screen)).toEqual(['#3020Theo OkaforPending$186.50Oct 6']);

    await userEvent.fill(search, '3019');
    await expect.poll(() => orderRows(screen)).toEqual(['#3019Priya RamanPaid$1,240.00Oct 5']);

    await userEvent.fill(search, 'ra');
    await expect.poll(() => orderRows(screen).map((row) => row.slice(0, 5))).toEqual(['#3021', '#3019']);

    await userEvent.fill(search, 'nobody');
    await expect.poll(() => orderRows(screen)).toEqual(['No orders match']);
    const empty = section(screen, 'Recent orders').element().querySelector('tbody td') as HTMLTableCellElement;
    expect(empty.colSpan).toBe(section(screen, 'Recent orders').element().querySelectorAll('thead th').length);

    await userEvent.fill(search, '');
    await expect.poll(() => orderRows(screen)).toHaveLength(8);
  });
});

test('5. the Chart recipe holds in place: the SVG is decoration, the Table holds the same rows, and the root resolves once', async () => {
  const screen = await render(<Dashboard01 />);

  for (const { root } of descriptor.recipes) {
    expect(await screen.getByRole(root.role as 'figure', { name: root.name, exact: true }).all()).toHaveLength(1);
  }
  const figure = screen.getByRole('figure', { name: 'Revenue', exact: true }).element();
  const svg = chart(screen);
  expect(figure.contains(svg)).toBe(true);
  expect(svg.getAttribute('aria-hidden')).toBe('true');
  expect(svg.getAttribute('role')).toBeNull();

  for (const period of ['Day', 'Week', 'Month']) {
    await userEvent.click(screen.getByRole('button', { name: period, exact: true }));
    if (period === 'Day') await userEvent.click(screen.getByRole('button', { name: 'Show data' }));
    const table = figure.querySelector('table') as HTMLTableElement;
    expect(table).not.toBeNull();
    const revenues = texts(table.querySelectorAll('tbody tr td:nth-child(2)')).map((cell) => Number(cell.replace(/[$,]/g, '')));
    const heights = [...svg.querySelectorAll('rect')].map((rect) => Number(rect.getAttribute('height')));
    expect(heights).toHaveLength(revenues.length);
    const pixelsPerDollar = (heights[0] as number) / (revenues[0] as number);
    heights.forEach((height, index) => expect(height).toBeCloseTo((revenues[index] as number) * pixelsPerDollar, 6));
  }
});

test('6. the root takes no props', () => {
  expectTypeOf(Dashboard01).parameters.toEqualTypeOf<[]>();
});
