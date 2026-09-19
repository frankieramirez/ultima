import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import tokensCss from '../../../tokens/dist/tokens.css?inline';
import ultimaBundle from '../../dist/ultima.js?raw';
import perElementBundle from '../../dist/ult-tabs.js?raw';

/**
 * Proof bar (docs/spec/ultima.md#what-an-element-build-ticket-proves), in element terms:
 * 1. Every combination mounts: variant (underline x segmented) on ult-tabs, through the
 *    parser and post-connect, and axes changed after connection take effect.
 * 2. The name resolves: the tablist is named through a forwarded aria-label, each tab by
 *    its text, and each tabpanel by its tab.
 * 3. The focus ring lands where the contract says: on the focused tab; the list, the
 *    panels, and the root render none.
 * 4. The primitive is still wired: Zag emits the APG contract — roles, aria-selected,
 *    aria-labelledby, aria-orientation, roving tabindex — and arrows/Home/End move focus
 *    with wrap and disabled-skip.
 * 5. Documented state drives its style: the selected tab's data-active mirror recolors
 *    it, data-disabled dims, and data-orientation turns the list.
 * 6. Typecheck passes: the element file is covered by pnpm typecheck.
 * 7. Behavior this element wires itself: connect starts the machine, disconnect stops it
 *    and drops its listeners, remount is clean; every tab carries aria-controls, the ADR
 *    0008 patch; the indicator tracks the selected tab's rect; the default activation
 *    matches Base UI's manual.
 * 8. CSS the primitive reads: none, because Zag reads no element styles — the one guard
 *    worth keeping is that [hidden] still wins over the panel's own declarations.
 */

const TABS_MARKUP = `
  <ult-tabs value="a">
    <ult-tabs-list aria-label="Sections">
      <ult-tabs-tab value="a">Alpha</ult-tabs-tab>
      <ult-tabs-tab value="b">Beta</ult-tabs-tab>
      <ult-tabs-tab value="c" disabled>Gamma</ult-tabs-tab>
      <ult-tabs-tab value="d">Delta</ult-tabs-tab>
      <ult-tabs-indicator></ult-tabs-indicator>
    </ult-tabs-list>
    <ult-tabs-panel value="a">Alpha panel</ult-tabs-panel>
    <ult-tabs-panel value="b">Beta panel</ult-tabs-panel>
    <ult-tabs-panel value="c">Gamma panel</ult-tabs-panel>
    <ult-tabs-panel value="d">Delta panel</ult-tabs-panel>
  </ult-tabs>`;

type ListenerEvent = { node: EventTarget; type: string; phase: 'add' | 'remove' };
const listenerLog: ListenerEvent[] = [];

function settle(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0))),
  );
}

function mountTabs(markup = TABS_MARKUP, parent: HTMLElement = document.body): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = markup;
  const host = wrapper.querySelector('ult-tabs') as HTMLElement;
  parent.appendChild(host);
  return host;
}

function innerTab(host: Element, index: number): HTMLElement {
  const tabs = host.querySelectorAll('ult-tabs-tab [part="tab"]');
  const tab = tabs[index];
  if (!tab) throw new Error(`ult-tabs-tab ${index} rendered no inner tab`);
  return tab as HTMLElement;
}

function innerPanel(host: Element, index: number): HTMLElement {
  const panels = host.querySelectorAll('ult-tabs-panel [part="panel"]');
  const panel = panels[index];
  if (!panel) throw new Error(`ult-tabs-panel ${index} rendered no inner panel`);
  return panel as HTMLElement;
}

beforeAll(async () => {
  const tokens = document.createElement('style');
  tokens.textContent = tokensCss;
  document.head.appendChild(tokens);

  const originalAdd = EventTarget.prototype.addEventListener;
  const originalRemove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    listenerLog.push({ node: this, type, phase: 'add' });
    return originalAdd.call(this, type, listener, options);
  };
  EventTarget.prototype.removeEventListener = function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    listenerLog.push({ node: this, type, phase: 'remove' });
    return originalRemove.call(this, type, listener, options);
  };

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../../dist/ult-tabs.js', import.meta.url).href;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('dist/ult-tabs.js failed to load'));
    document.head.appendChild(script);
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
  listenerLog.length = 0;
});

test('every part mounts as its inner element through the parser, with the APG roles', async () => {
  const host = mountTabs();
  await settle();
  const root = host.querySelector('[part="root"]');
  const list = host.querySelector('[part="list"]');
  const indicator = host.querySelector('[part="indicator"]');
  expect(root).not.toBeNull();
  expect(list).not.toBeNull();
  expect(indicator).not.toBeNull();
  await expect.element(page.getByRole('tab', { name: 'Alpha' })).toBeVisible();
  await expect.element(page.getByRole('tab', { name: 'Delta' })).toBeVisible();
  await expect.element(page.getByRole('tabpanel', { name: 'Alpha' })).toBeVisible();
  const tabA = innerTab(host, 0);
  const tabB = innerTab(host, 1);
  const tabC = innerTab(host, 2);
  expect(tabA).toHaveAttribute('aria-selected', 'true');
  expect(tabB).toHaveAttribute('aria-selected', 'false');
  expect(tabC).toHaveAttribute('aria-disabled', 'true');
  expect(tabA).toHaveAttribute('tabindex', '0');
  expect(tabB).toHaveAttribute('tabindex', '-1');
  expect(list).toHaveAttribute('aria-orientation', 'horizontal');
  expect(innerPanel(host, 1)).toHaveAttribute('hidden');
  expect(innerPanel(host, 0)).not.toHaveAttribute('hidden');
});

test('the family mounts when built post-connect', async () => {
  const host = document.createElement('ult-tabs');
  const list = document.createElement('ult-tabs-list');
  const tab = document.createElement('ult-tabs-tab');
  tab.setAttribute('value', 'only');
  tab.textContent = 'Only';
  const indicator = document.createElement('ult-tabs-indicator');
  const panel = document.createElement('ult-tabs-panel');
  panel.setAttribute('value', 'only');
  panel.textContent = 'Only panel';
  list.append(tab, indicator);
  host.append(list, panel);
  document.body.appendChild(host);
  await settle();
  await expect.element(page.getByRole('tab', { name: 'Only' })).toBeVisible();
  await expect.element(page.getByRole('tabpanel', { name: 'Only' })).toBeVisible();
});

test('a tab and panel added after connection join the machine', async () => {
  const host = mountTabs();
  await settle();
  const tab = document.createElement('ult-tabs-tab');
  tab.setAttribute('value', 'late');
  tab.textContent = 'Late';
  const panel = document.createElement('ult-tabs-panel');
  panel.setAttribute('value', 'late');
  panel.textContent = 'Late panel';
  host.querySelector('ult-tabs-list')?.appendChild(tab);
  host.appendChild(panel);
  await settle();
  await expect.element(page.getByRole('tab', { name: 'Late' })).toBeVisible();
  const inner = tab.querySelector('[part="tab"]') as HTMLElement;
  inner.click();
  await settle();
  expect(inner).toHaveAttribute('aria-selected', 'true');
  expect(panel.querySelector('[part="panel"]')).not.toHaveAttribute('hidden');
});

test('the tablist takes its accessible name from a forwarded aria-label', async () => {
  mountTabs();
  await settle();
  await expect.element(page.getByRole('tablist', { name: 'Sections' })).toBeVisible();
});

test('the focused tab carries the focus ring; the list and panel render none', async () => {
  const host = mountTabs();
  await settle();
  const tabA = innerTab(host, 0);
  const list = host.querySelector('[part="list"]') as HTMLElement;
  const panel = innerPanel(host, 0);
  await userEvent.tab();
  expect(document.activeElement).toBe(tabA);
  expect(getComputedStyle(tabA).outlineStyle).toBe('solid');
  expect(getComputedStyle(list).outlineStyle).toBe('none');
  expect(getComputedStyle(panel).outlineStyle).toBe('none');
});

test('arrows move focus with wrap and disabled-skip; Home and End jump to the ends', async () => {
  const host = mountTabs();
  await settle();
  const tabA = innerTab(host, 0);
  const tabB = innerTab(host, 1);
  const tabD = innerTab(host, 3);
  await userEvent.tab();
  expect(document.activeElement).toBe(tabA);
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(tabB);
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(tabD);
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(tabA);
  await userEvent.keyboard('{End}');
  expect(document.activeElement).toBe(tabD);
  await userEvent.keyboard('{Home}');
  expect(document.activeElement).toBe(tabA);
});

test('default activation is manual; activate-on-focus selects on arrow', async () => {
  const host = mountTabs();
  await settle();
  const tabA = innerTab(host, 0);
  const tabB = innerTab(host, 1);
  await userEvent.tab();
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(tabB);
  expect(tabB).toHaveAttribute('aria-selected', 'false');
  expect(tabA).toHaveAttribute('aria-selected', 'true');
  await userEvent.keyboard('{Enter}');
  await vi.waitFor(() => expect(tabB).toHaveAttribute('aria-selected', 'true'));

  const auto = mountTabs(TABS_MARKUP.replace('ult-tabs-list', 'ult-tabs-list activate-on-focus'));
  await settle();
  const autoA = innerTab(auto, 0);
  const autoB = innerTab(auto, 1);
  autoA.focus();
  await userEvent.keyboard('{ArrowRight}');
  await vi.waitFor(() => expect(autoB).toHaveAttribute('aria-selected', 'true'));
});

test('vertical orientation flips the arrow axis and aria-orientation', async () => {
  const host = mountTabs(TABS_MARKUP.replace('<ult-tabs', '<ult-tabs orientation="vertical"'));
  await settle();
  const tabA = innerTab(host, 0);
  const tabB = innerTab(host, 1);
  expect(host.querySelector('[part="list"]')).toHaveAttribute(
    'aria-orientation',
    'vertical',
  );
  await userEvent.tab();
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(tabA);
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(tabB);
});

test('a click selects the tab and shows its panel', async () => {
  const host = mountTabs();
  await settle();
  const tabB = innerTab(host, 1);
  tabB.click();
  await vi.waitFor(() => expect(tabB).toHaveAttribute('aria-selected', 'true'));
  expect(innerPanel(host, 1)).not.toHaveAttribute('hidden');
  expect(innerPanel(host, 0)).toHaveAttribute('hidden');
});

test('every tab carries aria-controls naming its panel, not only the selected one', async () => {
  const host = mountTabs();
  await settle();
  const controls = new Set<string>();
  for (const tab of host.querySelectorAll('[part="tab"]')) {
    const target = tab.getAttribute('aria-controls');
    expect(target).toBeTruthy();
    controls.add(target as string);
    expect(document.getElementById(target as string)).not.toBeNull();
  }
  expect(controls.size).toBe(4);
});

test('the value attribute selects after connection', async () => {
  const host = mountTabs();
  await settle();
  host.setAttribute('value', 'd');
  await vi.waitFor(() => expect(innerTab(host, 3)).toHaveAttribute('aria-selected', 'true'));
  expect(innerTab(host, 0)).toHaveAttribute('aria-selected', 'false');
});

test('the variant attribute restyles the list, tab, and indicator after connection', async () => {
  const host = mountTabs();
  await settle();
  const list = host.querySelector('[part="list"]') as HTMLElement;
  const tab = innerTab(host, 0);
  const indicator = host.querySelector('[part="indicator"]') as HTMLElement;
  const underline = [list.className, tab.className, indicator.className];
  host.setAttribute('variant', 'segmented');
  await settle();
  expect(list.className).not.toBe(underline[0]);
  expect(tab.className).not.toBe(underline[1]);
  expect(indicator.className).not.toBe(underline[2]);
});

test('the selected tab mirrors data-active and recolors against the muted rest', async () => {
  const host = mountTabs();
  await settle();
  const tabA = innerTab(host, 0);
  const tabB = innerTab(host, 1);
  expect(tabA).toHaveAttribute('data-active');
  expect(tabA).toHaveAttribute('data-selected');
  expect(tabB).not.toHaveAttribute('data-active');
  expect(getComputedStyle(tabA).color).not.toBe(getComputedStyle(tabB).color);
  tabB.click();
  await vi.waitFor(() => expect(tabB).toHaveAttribute('data-active'));
  expect(tabA).not.toHaveAttribute('data-active');
});

test('a consumer style keyed off Zag data-selected reaches the tab', async () => {
  const probe = document.createElement('style');
  probe.textContent = 'ult-tabs [data-selected] { text-decoration: underline; }';
  document.head.appendChild(probe);
  const host = mountTabs();
  await settle();
  const tabA = innerTab(host, 0);
  const tabB = innerTab(host, 1);
  expect(getComputedStyle(tabA).textDecorationLine).toContain('underline');
  expect(getComputedStyle(tabB).textDecorationLine).not.toContain('underline');
  probe.remove();
});

test('a disabled tab renders at reduced opacity and does not take click selection', async () => {
  const host = mountTabs();
  await settle();
  const tabC = innerTab(host, 2);
  expect(tabC).toHaveAttribute('data-disabled');
  expect(getComputedStyle(tabC).opacity).toBe('0.5');
  tabC.click();
  await settle();
  expect(tabC).toHaveAttribute('aria-selected', 'false');
});

test('the indicator tracks the selected tab’s rect', async () => {
  const host = mountTabs();
  await settle();
  const indicator = host.querySelector('[part="indicator"]') as HTMLElement;
  expect(indicator).not.toHaveAttribute('hidden');
  expect(indicator.offsetLeft).toBe(innerTab(host, 0).offsetLeft);
  expect(indicator.offsetWidth).toBe(innerTab(host, 0).offsetWidth);
  innerTab(host, 3).click();
  await vi.waitFor(() => {
    expect(indicator.offsetLeft).toBe(innerTab(host, 3).offsetLeft);
  });
});

test('an unselected panel is hidden and computes to display none', async () => {
  const host = mountTabs();
  await settle();
  const panel = innerPanel(host, 1);
  expect(panel).toHaveAttribute('hidden');
  expect(getComputedStyle(panel).display).toBe('none');
});

test('disconnect stops the machine and drops its listeners; remount is clean', async () => {
  const host = mountTabs();
  await settle();
  const list = host.querySelector('[part="list"]') as HTMLElement;
  const tabB = innerTab(host, 1);
  const watched = new Set<EventTarget>([list, tabB]);
  host.remove();
  await settle();
  const added = listenerLog.filter(
    (entry) => entry.phase === 'add' && watched.has(entry.node),
  );
  const removed = new Set(
    listenerLog
      .filter((entry) => entry.phase === 'remove' && watched.has(entry.node))
      .map((entry) => `${String(entry.node)}:${entry.type}`),
  );
  expect(added.length).toBeGreaterThan(0);
  for (const entry of added) {
    expect(removed, `listener ${entry.type} was not dropped`).toContain(
      `${String(entry.node)}:${entry.type}`,
    );
  }

  document.body.appendChild(host);
  await settle();
  await expect.element(page.getByRole('tab', { name: 'Alpha' })).toBeVisible();
  const remountedB = innerTab(host, 1);
  remountedB.click();
  await vi.waitFor(() => expect(remountedB).toHaveAttribute('aria-selected', 'true'));
});

test('the orientation attribute changes after connection reach the machine', async () => {
  const host = mountTabs();
  await settle();
  host.setAttribute('orientation', 'vertical');
  await settle();
  expect(host.querySelector('[part="list"]')).toHaveAttribute(
    'aria-orientation',
    'vertical',
  );
  const tabA = innerTab(host, 0);
  const tabB = innerTab(host, 1);
  await userEvent.tab();
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(tabB);
});

test('data-theme re-themes through the tokens stylesheet', async () => {
  const host = mountTabs();
  await settle();
  const tab = innerTab(host, 1);
  document.documentElement.setAttribute('data-theme', 'dark');
  await settle();
  const dark = getComputedStyle(tab).color;
  document.documentElement.setAttribute('data-theme', 'light');
  await settle();
  expect(getComputedStyle(tab).color).not.toBe(dark);
});

test('a consumer --ult-* override reaches the part', async () => {
  const wrapper = document.createElement('div');
  document.body.appendChild(wrapper);
  const host = mountTabs(TABS_MARKUP, wrapper);
  await settle();
  const tab = innerTab(host, 0);
  const before = getComputedStyle(tab).color;
  wrapper.style.setProperty('--ult-color-text', 'rgb(1, 2, 3)');
  await settle();
  expect(getComputedStyle(tab).color).not.toBe(before);
});

test('a consumer [part] selector reaches the inner target', async () => {
  const probe = document.createElement('style');
  probe.textContent = 'ult-tabs [part="panel"] { text-decoration: underline; }';
  document.head.appendChild(probe);
  const host = mountTabs();
  await settle();
  const panel = innerPanel(host, 0);
  expect(getComputedStyle(panel).textDecorationLine).toContain('underline');
  probe.remove();
});

test('the bundle injects its stylesheet into the document', () => {
  expect(document.head.querySelector('style[data-ultima-elements]')).not.toBeNull();
});

test('the emitted bundles carry no runtime stylex or external imports', () => {
  for (const bundle of [perElementBundle, ultimaBundle]) {
    expect(bundle).not.toMatch(/^import |^export |stylex\.(create|attrs|props)/m);
    expect(bundle).toContain('data-ultima-elements');
    for (const tag of [
      'ult-tabs',
      'ult-tabs-list',
      'ult-tabs-tab',
      'ult-tabs-panel',
      'ult-tabs-indicator',
    ]) {
      expect(bundle).toMatch(new RegExp(`customElements\\.define\\(["']${tag}["']`));
    }
  }
});
