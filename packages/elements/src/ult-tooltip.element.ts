import { normalizeProps, spreadProps, VanillaMachine, type Attrs } from '@zag-js/vanilla';
import { connect as connectTooltip, machine as tooltipMachine } from '@zag-js/tooltip';
import * as stylex from '@stylexjs/stylex';
import {
  border,
  color,
  easing,
  font,
  motion,
  radius,
  shadow,
  space,
  text,
  z,
} from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  positioner: {
    outline: 0,
  },
  popup: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-sm'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxShadow: shadow['--ult-shadow-sm'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-2'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
    maxWidth: `calc(${space['--ult-space-12']} * 5)`,
    opacity: {
      default: 1,
      ':is([data-starting-style])': 0,
      ':is([data-ending-style])': 0,
    },
    outline: { default: 'none', ':focus': 'none', ':focus-visible': 'none' },
    outlineWidth: { default: 0, ':focus': 0, ':focus-visible': 0 },
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-3'],
    transform: {
      default: 'none',
      ':is([data-starting-style])': 'scale(0.98)',
      ':is([data-ending-style])': 'scale(0.98)',
    },
    transformOrigin: 'var(--transform-origin)',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'opacity, transform',
    transitionTimingFunction: { default: easing.enter, ':is([data-ending-style])': easing.exit },
    zIndex: z.popup,
  },
  arrow: {
    height: space['--ult-space-4'],
    width: space['--ult-space-4'],
    '::before': {
      backgroundColor: color['--ult-color-surface-raised'],
      borderColor: color['--ult-color-border'],
      borderStyle: 'solid',
      borderWidth: border.hairline,
      content: '""',
      display: 'block',
      height: space['--ult-space-4'],
      transform: 'rotate(45deg)',
      width: space['--ult-space-4'],
    },
  },
});

// Compiled style objects are { <propKey>: '<classes>', $$css: true }; merging is
// last-write-wins per propKey, which is what styleq does for class strings.
function mergeStyles(
  ...list: ReadonlyArray<Record<string, string | boolean> | undefined>
): string {
  const byKey: Record<string, string> = {};
  for (const entry of list) {
    if (!entry) continue;
    for (const key of Object.keys(entry)) {
      if (key === '$$css') continue;
      byKey[key] = entry[key] as string;
    }
  }
  return Object.values(byKey).join(' ');
}

function adopt(host: HTMLElement, inner: HTMLElement): void {
  while (host.firstChild) inner.appendChild(host.firstChild);
  host.appendChild(inner);
}

function watch(host: HTMLElement, inner: HTMLElement): MutationObserver {
  const observer = new MutationObserver(() => {
    for (const child of Array.from(host.childNodes)) {
      if (child !== inner) inner.appendChild(child);
    }
  });
  observer.observe(host, { childList: true });
  return observer;
}

abstract class UltTooltipPart extends HTMLElement {
  inner: HTMLElement | null = null;
  private observer: MutationObserver | null = null;

  connectedCallback(): void {
    this.style.display = 'contents';
    let inner = this.inner;
    if (!inner) {
      inner = this.build();
      adopt(this, inner);
      this.inner = inner;
    }
    this.observer = watch(this, inner);
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  protected abstract build(): HTMLElement;
}

let nextId = 0;

function createTooltipMachine(host: HTMLElement, open: boolean) {
  return new VanillaMachine(tooltipMachine, {
    id: `ult-tooltip-${++nextId}`,
    getRootNode: () => host.getRootNode(),
    defaultOpen: open,
    positioning: { placement: 'top' },
    // The element tracks scroll itself: see UltTooltip.onScroll.
    closeOnScroll: false,
  });
}

class UltTooltip extends HTMLElement {
  static observedAttributes = ['open'];
  private machine: ReturnType<typeof createTooltipMachine> | null = null;
  private unsubscribe: (() => void) | null = null;
  private observer: MutationObserver | null = null;
  private spreadCleanups = new Map<Element, () => void>();
  private lastOpen = false;
  private positioned = false;

  connectedCallback(): void {
    this.style.display = 'contents';
    if (!this.machine) {
      this.machine = createTooltipMachine(this, this.hasAttribute('open'));
      this.machine.start();
      this.unsubscribe = this.machine.subscribe(() => this.paint());
      this.observer = new MutationObserver(() => this.paint());
      this.observer.observe(this, { childList: true, subtree: true });
    }
    this.ownerDocument.addEventListener('scroll', this.onScroll, { capture: true, passive: true });
    this.paint();
  }

  disconnectedCallback(): void {
    this.ownerDocument.removeEventListener('scroll', this.onScroll, { capture: true });
    this.observer?.disconnect();
    this.unsubscribe?.();
    this.machine?.stop();
    this.machine = null;
    this.unsubscribe = null;
    this.observer = null;
    for (const cleanup of this.spreadCleanups.values()) cleanup();
    this.spreadCleanups.clear();
    this.lastOpen = false;
    this.positioned = false;
  }

  attributeChangedCallback(): void {
    if (this.machine) {
      connectTooltip(this.machine.service, normalizeProps).setOpen(this.hasAttribute('open'));
    }
  }

  // Zag closes on any scroll of the trigger's scroll ancestors, and a Tab that
  // scrolls its trigger into view fires that scroll a frame after the focus that
  // opened the tooltip (#541). A focused trigger keeps its tooltip, which follows
  // it through the scroll; a pointer-opened tooltip still closes as Zag's does.
  private onScroll = (event: Event): void => {
    const machine = this.machine;
    const state = machine?.state.get();
    if (!machine || (state !== 'open' && state !== 'opening')) return;
    const trigger = this.querySelector(':scope > ult-tooltip-trigger')?.firstElementChild;
    if (!trigger) return;
    const target = event.target instanceof Document ? event.target.documentElement : event.target;
    if (!(target instanceof Node) || !target.contains(trigger)) return;
    const root = trigger.getRootNode() as Document | ShadowRoot;
    if (root.activeElement === trigger) return;
    machine.send({ type: 'close', src: 'scroll' });
  };

  private spread(target: Element | null | undefined, attrs: Attrs): void {
    if (!(target instanceof HTMLElement)) return;
    this.spreadCleanups.set(target, spreadProps(target, attrs));
  }

  private partInner(host: Element | null | undefined): Element | null {
    return host instanceof UltTooltipPart ? host.inner : null;
  }

  private paint(): void {
    const machine = this.machine;
    if (!machine) return;
    const api = connectTooltip(machine.service, normalizeProps);
    const positionerHost = this.querySelector(':scope > ult-tooltip-positioner');
    const popupHost = positionerHost?.querySelector('ult-tooltip-popup');
    const trigger = this.querySelector(':scope > ult-tooltip-trigger')?.firstElementChild;
    this.spread(trigger, api.getTriggerProps());
    const positioner = this.partInner(positionerHost);
    this.spread(positioner, api.getPositionerProps());
    const popup = this.partInner(popupHost);
    this.spread(popup, api.getContentProps());
    this.spread(
      this.partInner(positionerHost?.querySelector('ult-tooltip-arrow')),
      api.getArrowProps(),
    );
    if (!(popup instanceof HTMLElement)) return;
    // The machine can reach open before the parts are parsed, and its deferred
    // positioning effect never retries when the elements were missing, so the
    // first paint that finds every part repositions once.
    if (api.open && !this.positioned && trigger && positioner) {
      this.positioned = true;
      api.reposition();
    }
    // Zag emits only data-state; the restated table reads Base UI's transition
    // attributes, so the element drives them: open flashes starting-style for the
    // enter transition, and the closing state (a real closeDelay window) holds
    // ending-style until hidden lands.
    if (api.open && !this.lastOpen) {
      popup.setAttribute('data-starting-style', '');
      requestAnimationFrame(() =>
        requestAnimationFrame(() => popup.removeAttribute('data-starting-style')),
      );
    }
    if (machine.state.get() === 'closing') popup.setAttribute('data-ending-style', '');
    else popup.removeAttribute('data-ending-style');
    this.lastOpen = api.open;
  }
}

class UltTooltipTrigger extends HTMLElement {
  connectedCallback(): void {
    this.style.display = 'contents';
  }
}

class UltTooltipPositioner extends UltTooltipPart {
  protected build(): HTMLElement {
    const positioner = document.createElement('div');
    positioner.setAttribute('part', 'positioner');
    positioner.className = mergeStyles(styles.positioner);
    return positioner;
  }
}

class UltTooltipPopup extends UltTooltipPart {
  connectedCallback(): void {
    // Zag's popper reads --z-index off the floating element's firstElementChild,
    // which is this display:contents host, so the host carries the popup class:
    // no box is generated, but its computed z-index still feeds the variable.
    this.className = mergeStyles(styles.popup);
    super.connectedCallback();
  }

  protected build(): HTMLElement {
    const popup = document.createElement('div');
    popup.setAttribute('part', 'popup');
    popup.className = mergeStyles(styles.popup);
    popup.hidden = true;
    return popup;
  }
}

class UltTooltipArrow extends UltTooltipPart {
  protected build(): HTMLElement {
    const arrow = document.createElement('div');
    arrow.setAttribute('part', 'arrow');
    arrow.className = mergeStyles(styles.arrow);
    // Zag's arrow props set width and height to var(--arrow-size) inline, so the
    // token reaches the inline style through the variable it exposes.
    arrow.style.setProperty('--arrow-size', 'var(--ult-space-4)');
    return arrow;
  }
}

if (!customElements.get('ult-tooltip')) customElements.define('ult-tooltip', UltTooltip);
if (!customElements.get('ult-tooltip-trigger'))
  customElements.define('ult-tooltip-trigger', UltTooltipTrigger);
if (!customElements.get('ult-tooltip-positioner'))
  customElements.define('ult-tooltip-positioner', UltTooltipPositioner);
if (!customElements.get('ult-tooltip-popup'))
  customElements.define('ult-tooltip-popup', UltTooltipPopup);
if (!customElements.get('ult-tooltip-arrow'))
  customElements.define('ult-tooltip-arrow', UltTooltipArrow);
