import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import tokensCss from '../../../tokens/dist/tokens.css?inline';
import ultimaBundle from '../../dist/ultima.js?raw';
import perElementBundle from '../../dist/ult-table.js?raw';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves), in element terms:
 * 1. Every combination mounts: Table declares no axes, so one shape per part, mounted
 *    through the parser and post-connect.
 * 2. The name resolves: role table, named by ult-table-caption; the scroll region is a
 *    role=region named through a forwarded aria-labelledby.
 * 3. The focus ring lands where the contract says: on the scroll region while it
 *    overflows; every other part renders none, ult-table-sort-button included.
 * 4. The primitive is still wired: none, because Table has no primitive on either target.
 * 5. Documented state drives its style: `sort` on ult-table-head-cell emits aria-sort and
 *    data-sort, and a consumer style keyed off data-sort resolves per value.
 * 6. Typecheck passes: the element file is covered by pnpm typecheck.
 * 7. Behavior this element wires itself: the scroll region measures its own overflow — a
 *    tab stop only while it overflows — and its observers start on connect and stop on
 *    disconnect.
 * 8. CSS the primitive reads: none, because there is no primitive.
 */

const TABLE_MARKUP = `
  <ult-table>
    <ult-table-caption>Latency by region</ult-table-caption>
    <ult-table-head>
      <ult-table-row>
        <ult-table-head-cell>Region</ult-table-head-cell>
        <ult-table-head-cell sort="descending">p95</ult-table-head-cell>
      </ult-table-row>
    </ult-table-head>
    <ult-table-body>
      <ult-table-row>
        <ult-table-cell>us-east-1</ult-table-cell>
        <ult-table-cell>184ms</ult-table-cell>
      </ult-table-row>
    </ult-table-body>
  </ult-table>`;

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function innerTable(host: Element): HTMLTableElement {
  const table = host.querySelector('table');
  if (!table) throw new Error('ult-table rendered no inner table');
  return table;
}

function mountTable(parent: HTMLElement = document.body): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = TABLE_MARKUP;
  const table = wrapper.querySelector('ult-table') as HTMLElement;
  parent.appendChild(table);
  return table;
}

function buildCell(tag: string, text: string): HTMLElement {
  const cell = document.createElement(tag);
  cell.textContent = text;
  return cell;
}

function mountScroll(
  bound: string,
  wide: string | null,
  labelledby: string,
  labels = ['Package', 'Development', 'Preview', 'Production'],
  values = ['Tokens', 'Ready', 'Ready', 'Ready'],
): HTMLElement {
  const scroll = document.createElement('ult-table-scroll');
  scroll.setAttribute('aria-labelledby', labelledby);
  scroll.style.maxWidth = bound;
  const table = document.createElement('ult-table');
  if (wide) table.style.minWidth = wide;
  const caption = document.createElement('ult-table-caption');
  caption.id = labelledby;
  caption.textContent = 'Deployment status by environment';
  const head = document.createElement('ult-table-head');
  const headRow = document.createElement('ult-table-row');
  for (const label of labels) {
    headRow.appendChild(buildCell('ult-table-head-cell', label));
  }
  head.appendChild(headRow);
  const body = document.createElement('ult-table-body');
  const row = document.createElement('ult-table-row');
  for (const value of values) {
    row.appendChild(buildCell('ult-table-cell', value));
  }
  body.appendChild(row);
  table.append(caption, head, body);
  scroll.appendChild(table);
  document.body.appendChild(scroll);
  return scroll;
}

function scrollRegion(scroll: Element): HTMLElement {
  const found = scroll.querySelector('[part="scroll"]');
  if (!found) throw new Error('ult-table-scroll rendered no region');
  return found as HTMLElement;
}

beforeAll(async () => {
  const tokens = document.createElement('style');
  tokens.textContent = tokensCss;
  document.head.appendChild(tokens);
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../../dist/ult-table.js', import.meta.url).href;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('dist/ult-table.js failed to load'));
    document.head.appendChild(script);
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
});

test('every part mounts as its inner element inside a valid table, through the parser', async () => {
  const host = mountTable();
  await flush();
  const table = innerTable(host);
  expect(table.getAttribute('part')).toBe('root');
  expect(table.querySelector('caption')?.textContent).toBe('Latency by region');
  expect(table.querySelectorAll('thead tr th')).toHaveLength(2);
  expect(table.querySelectorAll('tbody tr td')).toHaveLength(2);
  await expect.element(page.getByRole('table', { name: 'Latency by region' })).toBeVisible();
});

test('every part mounts when the family is built post-connect', async () => {
  const table = document.createElement('ult-table');
  const body = document.createElement('ult-table-body');
  const row = document.createElement('ult-table-row');
  const cell = buildCell('ult-table-cell', 'us-east-1');
  row.appendChild(cell);
  body.appendChild(row);
  table.appendChild(body);
  document.body.appendChild(table);
  await flush();
  expect(innerTable(table).querySelector('tbody tr td')?.textContent).toBe('us-east-1');
});

test('a part added after its parent connected lands inside the inner element', async () => {
  const table = document.createElement('ult-table');
  document.body.appendChild(table);
  const body = document.createElement('ult-table-body');
  const row = document.createElement('ult-table-row');
  row.appendChild(buildCell('ult-table-cell', 'late'));
  body.appendChild(row);
  table.appendChild(body);
  await flush();
  expect(innerTable(table).querySelector('tbody tr td')?.textContent).toBe('late');
});

test('the table, its head cells, and its cells resolve by role', async () => {
  mountTable();
  await flush();
  await expect.element(page.getByRole('columnheader', { name: 'Region' })).toBeVisible();
  await expect.element(page.getByRole('cell', { name: 'us-east-1' })).toBeVisible();
});

test('tabbing through the table focuses nothing inside it', async () => {
  const host = mountTable();
  await flush();
  const table = innerTable(host);
  await userEvent.tab();
  expect(table.contains(document.activeElement)).toBe(false);
  expect(table).not.toHaveAttribute('tabindex');
  for (const part of table.querySelectorAll('*')) {
    expect(getComputedStyle(part).outlineStyle).toBe('none');
  }
});

test('a head cell defaults to scope col and takes scope row through the attribute', async () => {
  const host = mountTable();
  await flush();
  const cells = innerTable(host).querySelectorAll('th');
  expect(cells[0]).toHaveAttribute('scope', 'col');
  const rowHeader = buildCell('ult-table-head-cell', 'us-east-1');
  rowHeader.setAttribute('scope', 'row');
  const row = document.createElement('ult-table-row');
  row.appendChild(rowHeader);
  host.querySelector('ult-table-body')?.appendChild(row);
  await flush();
  const th = rowHeader.querySelector('th');
  expect(th).toHaveAttribute('scope', 'row');
  await expect.element(page.getByRole('rowheader', { name: 'us-east-1' })).toBeVisible();
});

for (const sort of ['ascending', 'descending', 'none'] as const) {
  test(`sort=${sort} emits aria-sort and data-sort on the inner head cell`, async () => {
    const host = document.createElement('ult-table-head-cell');
    host.setAttribute('sort', sort);
    host.textContent = 'Region';
    document.body.appendChild(host);
    await flush();
    const cell = host.querySelector('th');
    expect(cell).toHaveAttribute('aria-sort', sort);
    expect(cell).toHaveAttribute('data-sort', sort);
    expect(cell).toHaveAttribute('scope', 'col');
  });
}

test('a head cell with no sort emits neither attribute, and removing sort drops them', async () => {
  const host = document.createElement('ult-table-head-cell');
  host.textContent = 'Region';
  document.body.appendChild(host);
  await flush();
  const cell = host.querySelector('th') as HTMLElement;
  expect(cell).not.toHaveAttribute('aria-sort');
  expect(cell).not.toHaveAttribute('data-sort');
  host.setAttribute('sort', 'ascending');
  expect(cell).toHaveAttribute('aria-sort', 'ascending');
  host.removeAttribute('sort');
  expect(cell).not.toHaveAttribute('aria-sort');
  expect(cell).not.toHaveAttribute('data-sort');
});

test('cell attributes a td needs forward to the inner cell', async () => {
  const host = document.createElement('ult-table-cell');
  host.setAttribute('colspan', '2');
  host.textContent = 'wide';
  document.body.appendChild(host);
  await flush();
  expect(host.querySelector('td')).toHaveAttribute('colspan', '2');
});

test('data-sort drives a consumer style keyed off it', async () => {
  const probe = document.createElement('style');
  probe.textContent =
    'ult-table-head-cell [data-sort="descending"] { rotate: 180deg; }';
  document.head.appendChild(probe);
  const host = document.createElement('ult-table-head-cell');
  host.setAttribute('sort', 'descending');
  host.textContent = 'p95';
  document.body.appendChild(host);
  await flush();
  const cell = host.querySelector('th') as HTMLElement;
  expect(getComputedStyle(cell).rotate).toBe('180deg');
  host.setAttribute('sort', 'ascending');
  expect(getComputedStyle(cell).rotate).toBe('none');
  probe.remove();
});

test('the sort button is a plain type=button with no class of its own', async () => {
  const host = document.createElement('ult-table-sort-button');
  host.textContent = 'Region';
  document.body.appendChild(host);
  await flush();
  const button = host.querySelector('button') as HTMLElement;
  expect(button).toHaveAttribute('type', 'button');
  expect(button.getAttribute('class')).toBe(null);
  expect(button).not.toHaveAttribute('part');
});

test('the scroll region overflows, takes focus, and shows the ring', async () => {
  const scroll = mountScroll('20rem', '48rem', 'deployments');
  await flush();
  const target = scrollRegion(scroll);
  expect(target.tagName).toBe('DIV');
  await vi.waitFor(() => expect(target.tabIndex).toBe(0));
  expect(target.scrollWidth).toBeGreaterThan(target.clientWidth);
  await userEvent.tab();
  expect(document.activeElement).toBe(target);
  const ring = getComputedStyle(target);
  expect(ring.outlineStyle).toBe('solid');
  expect(ring.outlineWidth).not.toBe('0px');
});

test('the caption names the scroll region through the forwarded aria-labelledby', async () => {
  const scroll = mountScroll('20rem', '48rem', 'deployments');
  await flush();
  await expect
    .element(page.getByRole('region', { name: 'Deployment status by environment' }))
    .toBeVisible();
});

test('the scroll region is a tab stop only while its content overflows', async () => {
  const scroll = mountScroll('20rem', '48rem', 'deployments');
  const fitting = mountScroll('20rem', null, 'fitting', ['Region', 'p95'], ['us-east-1', '184ms']);
  await flush();
  const overflowing = scrollRegion(scroll);
  const contained = scrollRegion(fitting);
  await vi.waitFor(() => expect(overflowing.tabIndex).toBe(0));
  await vi.waitFor(() => {
    expect(contained.scrollWidth).toBe(contained.clientWidth);
    expect(contained.tabIndex).toBe(-1);
  });
});

test('a focused scroll region scrolls with the arrow keys', async () => {
  const scroll = mountScroll('20rem', '48rem', 'deployments');
  await flush();
  const target = scrollRegion(scroll);
  await vi.waitFor(() => expect(target.tabIndex).toBe(0));
  await userEvent.tab();
  expect(document.activeElement).toBe(target);
  await userEvent.keyboard('{ArrowRight}');
  await vi.waitFor(() => expect(target.scrollLeft).toBeGreaterThan(0));
});

test('disconnect and reconnect keep the element live', async () => {
  const host = document.createElement('ult-table-head-cell');
  host.textContent = 'Region';
  document.body.appendChild(host);
  await flush();
  host.remove();
  host.setAttribute('sort', 'descending');
  document.body.appendChild(host);
  await flush();
  const cell = host.querySelector('th');
  expect(cell).toHaveAttribute('data-sort', 'descending');
});

test('part= marks the inner styling targets', async () => {
  const host = mountTable();
  await flush();
  const table = innerTable(host);
  expect(table.getAttribute('part')).toBe('root');
  const parts = [...table.querySelectorAll('[part]')].map((part) => part.getAttribute('part'));
  for (const name of ['row', 'head-cell', 'cell', 'caption']) {
    expect(parts).toContain(name);
  }
});

test('a consumer [part] selector reaches the inner target', async () => {
  const probe = document.createElement('style');
  probe.textContent = 'ult-table [part="cell"] { text-decoration: underline; }';
  document.head.appendChild(probe);
  const host = mountTable();
  await flush();
  const cell = innerTable(host).querySelector('td') as HTMLElement;
  expect(getComputedStyle(cell).textDecorationLine).toContain('underline');
  probe.remove();
});

test('data-theme re-themes through the tokens stylesheet', async () => {
  const host = mountTable();
  await flush();
  const cell = innerTable(host).querySelector('th') as HTMLElement;
  document.documentElement.setAttribute('data-theme', 'dark');
  await flush();
  const dark = getComputedStyle(cell).color;
  document.documentElement.setAttribute('data-theme', 'light');
  await flush();
  expect(getComputedStyle(cell).color).not.toBe(dark);
});

test('a consumer --ult-* override reaches the part', async () => {
  const wrapper = document.createElement('div');
  document.body.appendChild(wrapper);
  const host = mountTable(wrapper);
  await flush();
  const cell = innerTable(host).querySelector('td') as HTMLElement;
  const before = getComputedStyle(cell).borderBlockEndColor;
  wrapper.style.setProperty('--ult-color-border', 'rgb(1, 2, 3)');
  await flush();
  expect(getComputedStyle(cell).borderBlockEndColor).not.toBe(before);
});

test('the bundle injects its stylesheet into the document', () => {
  expect(document.head.querySelector('style[data-ultima-elements]')).not.toBeNull();
});

test('the emitted bundles carry no runtime stylex or external imports', () => {
  for (const bundle of [perElementBundle, ultimaBundle]) {
    expect(bundle).not.toMatch(/^import |^export |stylex\.(create|attrs|props)/m);
    expect(bundle).toContain('data-ultima-elements');
    for (const tag of [
      'ult-table',
      'ult-table-scroll',
      'ult-table-head',
      'ult-table-body',
      'ult-table-row',
      'ult-table-head-cell',
      'ult-table-sort-button',
      'ult-table-cell',
      'ult-table-caption',
    ]) {
      expect(bundle).toMatch(new RegExp(`customElements\\.define\\(["']${tag}["']`));
    }
  }
});
