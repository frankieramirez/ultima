import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import { VanillaMachine, normalizeProps, spreadProps } from '@zag-js/vanilla';
import * as zagTabs from '@zag-js/tabs';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    margin: 0,
  },
  list: {
    display: 'flex',
    flexDirection: { default: 'row', ':is([data-orientation="vertical"])': 'column' },
    position: 'relative',
  },
  tab: {
    appearance: 'none',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text-muted'], ':is([data-active])': color['--ult-color-text'] },
    cursor: { default: 'pointer', ':is([data-disabled])': 'default' },
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
    position: 'relative',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'color',
    zIndex: 1,
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  indicator: {
    position: 'absolute',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'inset-block-start, inset-inline-start, width, height',
    transitionTimingFunction: easing.standard,
  },
  panel: {
    paddingBlockStart: space['--ult-space-6'],
  },
});

const lists = stylex.create({
  underline: {
    borderBlockEndColor: color['--ult-color-border'],
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: border.hairline,
    gap: space['--ult-space-6'],
  },
  segmented: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderRadius: radius['--ult-radius-md'],
    gap: space['--ult-space-1'],
    padding: space['--ult-space-1'],
  },
});

const tabs = stylex.create({
  underline: { borderRadius: radius['--ult-radius-md'] },
  segmented: { borderRadius: radius['--ult-radius-sm'] },
});

const indicators = stylex.create({
  underline: {
    backgroundColor: color['--ult-color-accent'],
    height: border.focus,
    insetBlockEnd: 'var(--active-tab-bottom)',
    insetInlineStart: 'var(--active-tab-left)',
    width: 'var(--active-tab-width)',
  },
  segmented: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderRadius: radius['--ult-radius-sm'],
    height: 'var(--active-tab-height)',
    insetBlockStart: 'var(--active-tab-top)',
    insetInlineStart: 'var(--active-tab-left)',
    width: 'var(--active-tab-width)',
    zIndex: 0,
  },
});

const VARIANTS = ['underline', 'segmented'] as const;
const ORIENTATIONS = ['horizontal', 'vertical'] as const;
const DIRECTIONS = ['ltr', 'rtl'] as const;

let uid = 0;

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

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function adopt(host: HTMLElement, inner: HTMLElement): void {
  while (host.firstChild) inner.appendChild(host.firstChild);
  host.appendChild(inner);
}

function watch(host: HTMLElement, inner: HTMLElement, onChange: () => void): MutationObserver {
  const observer = new MutationObserver(() => {
    for (const child of Array.from(host.childNodes)) {
      if (child !== inner) inner.appendChild(child);
    }
    onChange();
  });
  observer.observe(host, { childList: true });
  return observer;
}

function forward(host: HTMLElement, inner: HTMLElement, name: string): void {
  const value = host.getAttribute(name);
  if (value === null) inner.removeAttribute(name);
  else inner.setAttribute(name, value);
}

function createMachine(props: () => Partial<zagTabs.Props>) {
  return new VanillaMachine(zagTabs.machine, props);
}
type TabsMachine = ReturnType<typeof createMachine>;

abstract class UltTabsPart extends HTMLElement {
  protected hostDisplay = 'contents';
  protected inner: HTMLElement | null = null;
  private observer: MutationObserver | null = null;

  connectedCallback(): void {
    this.style.display = this.hostDisplay;
    let inner = this.inner;
    if (!inner) {
      inner = this.build();
      adopt(this, inner);
      this.inner = inner;
    }
    this.observer = watch(this, inner, () => this.childrenChanged());
    this.sync(inner);
    this.partConnected();
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.partDisconnected();
  }

  attributeChangedCallback(
    _name: string,
    _oldValue: string | null,
    _newValue: string | null,
  ): void {
    if (this.inner) this.sync(this.inner);
    this.partChanged();
  }

  get el(): HTMLElement | null {
    return this.inner;
  }

  protected abstract build(): HTMLElement;

  protected sync(_inner: HTMLElement): void {}

  protected childrenChanged(): void {
    this.partChanged();
  }

  protected partConnected(): void {
    this.partChanged();
  }

  protected partDisconnected(): void {}

  partChanged(): void {
    this.tabsRoot()?.partChanged();
  }

  protected tabsRoot(): UltTabs | null {
    const root = this.closest('ult-tabs');
    return root instanceof UltTabs ? root : null;
  }
}

const LIST_FORWARDED = ['aria-label', 'aria-labelledby'] as const;

class UltTabs extends UltTabsPart {
  static observedAttributes = ['variant', 'value', 'orientation', 'dir'];
  protected override hostDisplay = 'block';
  private machine: TabsMachine | null = null;
  private started = false;
  private startFrame = 0;
  private spreads = new Map<Element, () => void>();
  private scopeId = '';

  protected build(): HTMLElement {
    const root = document.createElement('div');
    root.setAttribute('part', 'root');
    root.className = mergeStyles(styles.root);
    return root;
  }

  protected override partConnected(): void {
    // Zag scopes every generated id off this one; without it two instances
    // share tabs:undefined:* and arrow navigation hits the wrong list.
    this.scopeId = this.id || `ult-tabs-${++uid}`;
    const machine = createMachine(() => this.machineProps());
    this.machine = machine;
    machine.subscribe(() => this.render());
    // Parts that already connected carry no Zag ids or roles yet; spreading
    // before start() lets the entry actions that measure them find the DOM.
    this.render();
    this.startFrame = requestAnimationFrame(() => {
      if (!this.isConnected || this.machine !== machine) return;
      machine.start();
      this.started = true;
      this.syncValueAttribute();
      this.render();
    });
  }

  protected override partDisconnected(): void {
    cancelAnimationFrame(this.startFrame);
    this.machine?.stop();
    this.machine = null;
    this.started = false;
    for (const cleanup of this.spreads.values()) cleanup();
    this.spreads.clear();
  }

  override attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    _newValue: string | null,
  ): void {
    if (!this.machine) return;
    if (name === 'value') {
      // Present selects; absent keeps the machine's own selection.
      if (this.started) this.syncValueAttribute();
      return;
    }
    if (name === 'orientation' || name === 'dir') {
      // The props function re-reads the attributes; the publish runs the
      // machine's watchers, which re-measure the indicator on orientation.
      this.machine.updateProps({});
      return;
    }
    this.partChanged();
  }

  override partChanged(): void {
    this.render();
    const machine = this.machine;
    if (!machine || !this.started) return;
    machine.send({ type: 'SET_INDICATOR_RECT' });
    machine.send({ type: 'SYNC_TAB_INDEX' });
    // A family mounted with no selected tab still owes the list a tab stop, so
    // the first enabled tab is selected the way Base UI's initial fallback is.
    if (this.machineValue() === null) {
      const first = this.firstEnabledValue();
      if (first !== null) machine.send({ type: 'SET_VALUE', value: first });
    }
  }

  private syncValueAttribute(): void {
    const value = this.getAttribute('value');
    if (value !== null && value !== this.machineValue()) {
      this.machine?.send({ type: 'SET_VALUE', value });
    }
  }

  private machineValue(): string | null {
    const machine = this.machine;
    if (!machine) return null;
    return zagTabs.connect(machine.service, normalizeProps).value;
  }

  private machineProps(): Partial<zagTabs.Props> {
    const list = this.ownPart('ult-tabs-list');
    return {
      id: this.scopeId,
      defaultValue: this.getAttribute('value') ?? this.firstEnabledValue(),
      orientation: pick(this.getAttribute('orientation'), ORIENTATIONS, 'horizontal'),
      activationMode: list?.hasAttribute('activate-on-focus') ? 'automatic' : 'manual',
      loopFocus: list?.getAttribute('loop-focus') !== 'false',
      dir: pick(this.getAttribute('dir'), DIRECTIONS, 'ltr'),
      // getById needs a Document; the host's own root node is just the host
      // once it is detached, and queued machine work can outlive connection.
      getRootNode: () => this.ownerDocument,
    };
  }

  private ownPart(tag: string): HTMLElement | null {
    for (const part of this.querySelectorAll(tag)) {
      if (part.closest('ult-tabs') === this) return part as HTMLElement;
    }
    return null;
  }

  private ownParts(tag: string): HTMLElement[] {
    return [...this.querySelectorAll(tag)].filter(
      (part) => part.closest('ult-tabs') === this,
    ) as HTMLElement[];
  }

  private partValue(host: HTMLElement, index: number): string {
    return host.getAttribute('value') ?? String(index);
  }

  private firstEnabledValue(): string | null {
    const hosts = this.ownParts('ult-tabs-tab');
    const index = hosts.findIndex((host) => !host.hasAttribute('disabled'));
    const host = hosts[index];
    if (!host) return null;
    return this.partValue(host, index);
  }

  private spread(element: Element, attrs: Record<string, unknown>): void {
    this.spreads.set(element, spreadProps(element, attrs));
  }

  private render(): void {
    const machine = this.machine;
    const inner = this.inner;
    if (!machine || !inner) return;
    const api = zagTabs.connect(machine.service, normalizeProps);
    const variant = pick(this.getAttribute('variant'), VARIANTS, 'underline');

    inner.className = mergeStyles(styles.root);
    this.spread(inner, api.getRootProps());

    const listHost = this.ownPart('ult-tabs-list');
    const list = listHost instanceof UltTabsList ? listHost.el : null;
    if (listHost && list) {
      list.className = mergeStyles(styles.list, lists[variant]);
      this.spread(list, api.getListProps());
      for (const name of LIST_FORWARDED) forward(listHost, list, name);
    }

    this.ownParts('ult-tabs-tab').forEach((host, index) => {
      if (!(host instanceof UltTabsTab)) return;
      const tab = host.el;
      if (!tab) return;
      const value = this.partValue(host, index);
      tab.className = mergeStyles(styles.tab, tabs[variant]);
      this.spread(
        tab,
        api.getTriggerProps({ value, disabled: host.hasAttribute('disabled') }),
      );
      // Zag writes aria-controls on the selected tab only; APG and Base UI put it
      // on every tab, so the element patches it (ADR 0008).
      tab.setAttribute('aria-controls', String(api.getContentProps({ value }).id));
      // Zag's vocabulary marks selection as data-selected while the restated
      // React styles key on Base UI's data-active, so the element mirrors it.
      tab.toggleAttribute('data-active', tab.hasAttribute('data-selected'));
    });

    this.ownParts('ult-tabs-panel').forEach((host, index) => {
      if (!(host instanceof UltTabsPanel)) return;
      const panel = host.el;
      if (!panel) return;
      panel.className = mergeStyles(styles.panel);
      this.spread(panel, api.getContentProps({ value: this.partValue(host, index) }));
    });

    const indicatorHost = this.ownPart('ult-tabs-indicator');
    const indicator = indicatorHost instanceof UltTabsIndicator ? indicatorHost.el : null;
    if (indicator) {
      indicator.className = mergeStyles(styles.indicator, indicators[variant]);
      this.spread(indicator, api.getIndicatorProps());
      const style = indicator.style;
      // Zag measures into --left/--top/--width/--height while the restated table
      // reads Base UI's --active-tab-* names, so the element maps between them.
      style.setProperty('--active-tab-left', 'var(--left)');
      style.setProperty('--active-tab-top', 'var(--top)');
      style.setProperty('--active-tab-width', 'var(--width)');
      style.setProperty('--active-tab-height', 'var(--height)');
      style.setProperty('--active-tab-bottom', 'calc(100% - var(--top) - var(--height))');
      // The inline transition would beat the class's token values; clearing the
      // two declarations lets the restated duration and easing apply.
      style.removeProperty('transition-duration');
      style.removeProperty('transition-timing-function');
    }
  }
}

class UltTabsList extends UltTabsPart {
  static observedAttributes = [...LIST_FORWARDED, 'activate-on-focus', 'loop-focus'];

  protected build(): HTMLElement {
    const list = document.createElement('div');
    list.setAttribute('part', 'list');
    list.className = mergeStyles(styles.list, lists.underline);
    return list;
  }

  protected override sync(list: HTMLElement): void {
    for (const name of LIST_FORWARDED) forward(this, list, name);
  }
}

class UltTabsTab extends UltTabsPart {
  static observedAttributes = ['value', 'disabled'];

  protected build(): HTMLElement {
    const tab = document.createElement('button');
    tab.setAttribute('part', 'tab');
    tab.type = 'button';
    tab.className = mergeStyles(styles.tab, tabs.underline);
    return tab;
  }

  protected override sync(tab: HTMLElement): void {
    const disabled = this.hasAttribute('disabled');
    (tab as HTMLButtonElement).disabled = disabled;
    tab.toggleAttribute('data-disabled', disabled);
  }
}

class UltTabsPanel extends UltTabsPart {
  static observedAttributes = ['value'];

  protected build(): HTMLElement {
    const panel = document.createElement('div');
    panel.setAttribute('part', 'panel');
    panel.className = mergeStyles(styles.panel);
    return panel;
  }
}

class UltTabsIndicator extends UltTabsPart {
  protected build(): HTMLElement {
    const indicator = document.createElement('div');
    indicator.setAttribute('part', 'indicator');
    indicator.className = mergeStyles(styles.indicator, indicators.underline);
    return indicator;
  }
}

if (!customElements.get('ult-tabs')) customElements.define('ult-tabs', UltTabs);
if (!customElements.get('ult-tabs-list')) customElements.define('ult-tabs-list', UltTabsList);
if (!customElements.get('ult-tabs-tab')) customElements.define('ult-tabs-tab', UltTabsTab);
if (!customElements.get('ult-tabs-panel'))
  customElements.define('ult-tabs-panel', UltTabsPanel);
if (!customElements.get('ult-tabs-indicator'))
  customElements.define('ult-tabs-indicator', UltTabsIndicator);
