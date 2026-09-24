import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import axe from 'axe-core';

import tokensCss from '../../../tokens/dist/tokens.css?inline';
import ultimaBundle from '../../dist/ultima.js?raw';
import perElementBundle from '../../dist/ult-tooltip.js?raw';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves), in element terms:
 * 1. Every combination mounts: Tooltip declares no axes, so the shapes are closed
 *    and open, mounted through the parser and post-connect.
 * 2. The name resolves: role tooltip on the popup while open, and the trigger's own
 *    element carries the accessible name the tooltip text must match.
 * 3. The focus ring lands where the contract says: on the trigger's own element;
 *    the floating parts render none.
 * 4. The primitive is still wired: Zag drives it — the trigger carries Zag's
 *    data-scope/data-part/id and aria-describedby only while open, hover and focus
 *    open after their delays, Escape and blur close, and touch never opens.
 *    Scroll closes as Zag's closeOnScroll does, except while the trigger holds
 *    focus, so a Tab that scrolls the trigger into view keeps its tooltip (#541).
 * 5. Documented state drives its style: data-state is on the styled parts, and the
 *    element-held data-ending-style covers Zag's closing window.
 * 6. Typecheck passes: the element file is covered by pnpm typecheck.
 * 7. Behavior this element wires itself: the machine starts on connect, stops on
 *    disconnect with its listeners dropped, and remounts clean.
 * 8. CSS the primitive reads stays token-bound: the popper resolves the popup's
 *    computed z-index into --z-index on the positioner, and the arrow's token width
 *    reaches its inline size through var(--arrow-size).
 */

const TOOLTIP_MARKUP = `
  <ult-tooltip>
    <ult-tooltip-trigger><button type="button" aria-label="Copied to clipboard">Copy</button></ult-tooltip-trigger>
    <ult-tooltip-positioner>
      <ult-tooltip-popup>Copied to clipboard<ult-tooltip-arrow></ult-tooltip-arrow></ult-tooltip-popup>
    </ult-tooltip-positioner>
  </ult-tooltip>`;

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function mountTooltip(open = false): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = open ? TOOLTIP_MARKUP.replace('<ult-tooltip>', '<ult-tooltip open>') : TOOLTIP_MARKUP;
  const tooltip = wrapper.querySelector('ult-tooltip') as HTMLElement;
  document.body.appendChild(tooltip);
  return tooltip;
}

function parts(root: Element) {
  const triggerHost = root.querySelector(':scope > ult-tooltip-trigger');
  const positionerHost = root.querySelector(':scope > ult-tooltip-positioner');
  return {
    trigger: triggerHost?.firstElementChild as HTMLElement | undefined,
    positioner: positionerHost?.firstElementChild as HTMLElement | undefined,
    popup: positionerHost?.querySelector('ult-tooltip-popup')?.firstElementChild as
      | HTMLElement
      | undefined,
    arrow: positionerHost
      ?.querySelector('ult-tooltip-arrow')
      ?.firstElementChild as HTMLElement | undefined,
  };
}

beforeAll(async () => {
  const tokens = document.createElement('style');
  tokens.textContent = tokensCss;
  document.head.appendChild(tokens);
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../../dist/ult-tooltip.js', import.meta.url).href;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('dist/ult-tooltip.js failed to load'));
    document.head.appendChild(script);
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
});

test('every part mounts inside the family through the parser, and the popup stays hidden while closed', async () => {
  const root = mountTooltip();
  await flush();
  const { trigger, positioner, popup, arrow } = parts(root);
  for (const el of [trigger, positioner, popup, arrow]) {
    expect(el, 'mounted part').not.toBeNull();
  }
  expect(popup!.getAttribute('part')).toBe('popup');
  expect(positioner!.getAttribute('part')).toBe('positioner');
  expect(arrow!.getAttribute('part')).toBe('arrow');
  expect(popup!.getAttribute('role')).toBe('tooltip');
  expect(popup!.hasAttribute('hidden')).toBe(true);
  expect(trigger!.hasAttribute('aria-describedby')).toBe(false);
});

test('the family mounts when the consumer builds it post-connect', async () => {
  const root = document.createElement('ult-tooltip');
  document.body.appendChild(root);
  root.insertAdjacentHTML(
    'beforeend',
    `<ult-tooltip-trigger><button type="button" aria-label="Copied to clipboard">Copy</button></ult-tooltip-trigger>
     <ult-tooltip-positioner><ult-tooltip-popup>Copied to clipboard</ult-tooltip-popup></ult-tooltip-positioner>`,
  );
  await flush();
  const { trigger, popup } = parts(root);
  expect(trigger!.getAttribute('data-part')).toBe('trigger');
  expect(popup!.getAttribute('role')).toBe('tooltip');
  expect(popup!.hasAttribute('hidden')).toBe(true);
});

test('the trigger carries Zag wiring and the parts carry their data-scope and data-part', async () => {
  const root = mountTooltip();
  await flush();
  const { trigger, positioner, popup, arrow } = parts(root);
  expect(trigger!.getAttribute('data-scope')).toBe('tooltip');
  expect(trigger!.getAttribute('data-part')).toBe('trigger');
  const scopeId = trigger!.getAttribute('data-ownedby');
  expect(trigger!.id).toBe(`tooltip:${scopeId}:trigger`);
  expect(popup!.id).toBe(`tooltip:${scopeId}:content`);
  expect(popup!.getAttribute('data-scope')).toBe('tooltip');
  expect(positioner!.getAttribute('data-part')).toBe('positioner');
  expect(popup!.getAttribute('data-part')).toBe('content');
  expect(arrow!.getAttribute('data-part')).toBe('arrow');
});

test('hover opens after the open delay and leaving the trigger closes', async () => {
  const root = mountTooltip();
  await flush();
  const { trigger, popup } = parts(root);
  await userEvent.hover(trigger!);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(false), { timeout: 2000 });
  expect(trigger!.getAttribute('aria-describedby')).toBe(popup!.id);
  expect(trigger!.getAttribute('data-state')).toBe('open');
  expect(popup!.getAttribute('data-state')).toBe('open');
  await userEvent.unhover(trigger!);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(true), { timeout: 2000 });
  expect(trigger!.hasAttribute('aria-describedby')).toBe(false);
  expect(trigger!.getAttribute('data-state')).toBe('closed');
});

test('focus opens the tooltip and blur closes it', async () => {
  const root = mountTooltip();
  await flush();
  const { trigger, popup } = parts(root);
  await userEvent.tab();
  expect(document.activeElement).toBe(trigger);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(false), { timeout: 2000 });
  await userEvent.tab();
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(true), { timeout: 2000 });
});

function mountBelowFold(): { before: HTMLButtonElement; root: HTMLElement } {
  const before = document.createElement('button');
  before.type = 'button';
  before.textContent = 'Before';
  const spacer = document.createElement('div');
  spacer.style.height = '200vh';
  document.body.append(before, spacer);
  return { before, root: mountTooltip() };
}

function frames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (left: number) =>
      left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(count);
  });
}

test('a Tab that scrolls the trigger into view keeps the tooltip it opened (#541)', async () => {
  const { before, root } = mountBelowFold();
  await flush();
  const { trigger, popup } = parts(root);
  before.focus();
  let scrolled = false;
  document.addEventListener('scroll', () => (scrolled = true), { capture: true, once: true });
  await userEvent.tab();
  expect(document.activeElement).toBe(trigger);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(false), { timeout: 2000 });
  await vi.waitFor(() => expect(scrolled).toBe(true), { timeout: 2000 });
  await frames(3);
  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(popup!.hasAttribute('hidden')).toBe(false);
  expect(popup!.getAttribute('data-state')).toBe('open');
  window.scrollTo(0, 0);
});

test('scrolling closes a tooltip whose trigger does not hold focus', async () => {
  const { root } = mountBelowFold();
  await flush();
  const { trigger, popup } = parts(root);
  trigger!.scrollIntoView();
  await frames(2);
  await userEvent.hover(trigger!);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(false), { timeout: 2000 });
  expect(document.activeElement).not.toBe(trigger);
  window.scrollBy(0, -50);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(true), { timeout: 2000 });
  await userEvent.unhover(trigger!);
  window.scrollTo(0, 0);
});

test('scrolling a region that does not hold the trigger leaves the tooltip open', async () => {
  const root = mountTooltip();
  const region = document.createElement('div');
  region.style.height = '100px';
  region.style.overflow = 'auto';
  region.innerHTML = '<div style="height: 400px"></div>';
  document.body.appendChild(region);
  await flush();
  const { trigger, popup } = parts(root);
  await userEvent.hover(trigger!);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(false), { timeout: 2000 });
  region.scrollTop = 50;
  await frames(3);
  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(popup!.hasAttribute('hidden')).toBe(false);
  await userEvent.unhover(trigger!);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(true), { timeout: 2000 });
});

test('Escape closes the tooltip', async () => {
  const root = mountTooltip();
  await flush();
  const { trigger, popup } = parts(root);
  await userEvent.tab();
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(false), { timeout: 2000 });
  await userEvent.keyboard('{Escape}');
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(true), { timeout: 2000 });
  expect(trigger!.hasAttribute('aria-describedby')).toBe(false);
});

test('touch never opens the tooltip', async () => {
  const root = mountTooltip();
  await flush();
  const { trigger, popup } = parts(root);
  for (const type of ['pointerover', 'pointermove', 'pointerdown']) {
    trigger!.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'touch' }));
  }
  await new Promise((resolve) => setTimeout(resolve, 600));
  expect(popup!.hasAttribute('hidden')).toBe(true);
  expect(trigger!.hasAttribute('aria-describedby')).toBe(false);
});

test('the open attribute mounts the tooltip statically open and removing it closes', async () => {
  const root = mountTooltip(true);
  const { trigger, popup } = parts(root);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(false), { timeout: 2000 });
  expect(trigger!.getAttribute('aria-describedby')).toBe(popup!.id);
  root.removeAttribute('open');
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(true), { timeout: 2000 });
});

test('the positioner resolves the popup token z-index and the arrow resolves its token size', async () => {
  const root = mountTooltip(true);
  const { positioner, popup, arrow } = parts(root);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(false), { timeout: 2000 });
  await vi.waitFor(() => {
    const zIndex = positioner!.style.getPropertyValue('--z-index');
    expect(zIndex).not.toBe('');
    expect(getComputedStyle(positioner!).zIndex).toBe(zIndex.trim());
  });
  expect(getComputedStyle(positioner!).transform).not.toBe('none');
  expect(getComputedStyle(popup!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(Number.parseFloat(getComputedStyle(arrow!).width)).toBeGreaterThan(0);
});

test('data-ending-style holds through the closing window and drops with the popup', async () => {
  const root = mountTooltip();
  await flush();
  const { trigger, popup } = parts(root);
  await userEvent.hover(trigger!);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(false), { timeout: 2000 });
  await userEvent.unhover(trigger!);
  await flush();
  expect(popup!.hasAttribute('data-ending-style')).toBe(true);
  expect(popup!.hasAttribute('hidden')).toBe(false);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(true), { timeout: 2000 });
  expect(popup!.hasAttribute('data-ending-style')).toBe(false);
});

test('a consumer [part] selector reaches the popup through the light DOM', async () => {
  const probe = document.createElement('style');
  probe.textContent = 'ult-tooltip-popup [part="popup"] { text-decoration: underline; }';
  document.head.appendChild(probe);
  const root = mountTooltip(true);
  const { popup } = parts(root);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(false), { timeout: 2000 });
  expect(getComputedStyle(popup!).textDecorationLine).toContain('underline');
  probe.remove();
});

test('disconnect stops the machine and drops its listeners; reconnecting restores them', async () => {
  const root = mountTooltip();
  await flush();
  const { trigger, popup } = parts(root);
  await userEvent.hover(trigger!);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(false), { timeout: 2000 });
  await userEvent.unhover(trigger!);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(true), { timeout: 2000 });
  root.remove();
  for (const type of ['pointerover', 'pointermove']) {
    trigger!.dispatchEvent(new PointerEvent(type, { bubbles: true }));
  }
  await new Promise((resolve) => setTimeout(resolve, 600));
  expect(popup!.hasAttribute('hidden')).toBe(true);
  expect(trigger!.hasAttribute('aria-describedby')).toBe(false);
  document.body.appendChild(root);
  await userEvent.hover(trigger!);
  await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(false), { timeout: 2000 });
});

test('the open state is axe-clean in both modes', async () => {
  for (const theme of ['dark', 'light']) {
    document.documentElement.setAttribute('data-theme', theme);
    const root = mountTooltip(true);
    const { popup } = parts(root);
    await vi.waitFor(() => expect(popup!.hasAttribute('hidden')).toBe(false), { timeout: 2000 });
    await vi.waitFor(() => expect(getComputedStyle(popup!).opacity).toBe('1'), { timeout: 2000 });
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(
      results.violations.map(
        (violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`,
      ),
      theme,
    ).toEqual([]);
    document.body.innerHTML = '';
  }
});

test('the emitted bundles carry every tag and no runtime stylex or external imports', () => {
  for (const bundle of [perElementBundle, ultimaBundle]) {
    expect(bundle).not.toMatch(/^import |^export |stylex\.(create|attrs|props)/m);
    expect(bundle).toContain('data-ultima-elements');
    for (const tag of [
      'ult-tooltip',
      'ult-tooltip-trigger',
      'ult-tooltip-positioner',
      'ult-tooltip-popup',
      'ult-tooltip-arrow',
    ]) {
      expect(bundle).toMatch(new RegExp(`customElements\\.define\\(["']${tag}["']`));
    }
  }
});
