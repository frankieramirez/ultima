import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';

const DESKTOP = '@media (min-width: 48rem)';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-2'],
    margin: 0,
  },
  label: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    letterSpacing: font['--ult-font-tracking-wide'],
    lineHeight: font['--ult-font-leading-snug'],
    textTransform: 'uppercase',
  },
  /**
   * A headline number can't wrap, so it holds 24px where stat cards sit two-up on a phone and steps
   * up to 30px from the desktop breakpoint, where it has the room to stand clear of a Card title.
   */
  value: {
    color: color['--ult-color-text'],
    fontSize: { default: text['--ult-text-8'], [DESKTOP]: text['--ult-text-9'] },
    fontVariantNumeric: 'tabular-nums',
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-none'],
  },
  /** A Badge's type role without the pill: a short figure tagged onto the value above it. */
  delta: {
    alignItems: 'center',
    display: 'flex',
    fontSize: text['--ult-text-2'],
    fontVariantNumeric: 'tabular-nums',
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-2'],
    lineHeight: font['--ult-font-leading-snug'],
  },
});

/** Tone follows what the change means, never its sign: a rising refund rate is `warning`. */
const deltaTones = stylex.create({
  neutral: { color: color['--ult-color-text-muted'] },
  success: { color: color['--ult-color-success-text'] },
  warning: { color: color['--ult-color-warning-text'] },
  danger: { color: color['--ult-color-danger-text'] },
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

class UltStat extends HTMLElement {
  private root: HTMLDivElement | null = null;

  connectedCallback() {
    if (this.root) return;
    const root = document.createElement('div');
    root.setAttribute('part', 'root');
    while (this.firstChild) root.appendChild(this.firstChild);
    root.className = mergeStyles(styles.root);
    this.appendChild(root);
    this.root = root;
  }
}

class UltStatLabel extends HTMLElement {
  connectedCallback() {
    if (this.firstElementChild) return;
    const label = document.createElement('span');
    label.setAttribute('part', 'label');
    while (this.firstChild) label.appendChild(this.firstChild);
    label.className = mergeStyles(styles.label);
    this.appendChild(label);
  }
}

class UltStatValue extends HTMLElement {
  connectedCallback() {
    if (this.firstElementChild) return;
    const value = document.createElement('span');
    value.setAttribute('part', 'value');
    while (this.firstChild) value.appendChild(this.firstChild);
    value.className = mergeStyles(styles.value);
    this.appendChild(value);
  }
}

const TONES = ['neutral', 'success', 'warning', 'danger'] as const;
const TRENDS = ['up', 'down'] as const;
type Trend = (typeof TRENDS)[number];

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

// Lucide's trending-up and trending-down on its 24 grid at Ultima's 1.5 stroke, as React draws them.
const TREND_PATHS: Record<Trend, readonly [string, string]> = {
  up: ['M16 7h6v6', 'm22 7-8.5 8.5-5-5L2 17'],
  down: ['M16 17h6v-6', 'm22 17-8.5-8.5-5 5L2 7'],
};

const SVG_NS = 'http://www.w3.org/2000/svg';

function trendGlyph(trend: Trend): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [name, value] of Object.entries({
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.5',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    width: '1em',
    height: '1em',
    'aria-hidden': 'true',
  })) {
    svg.setAttribute(name, value);
  }
  for (const d of TREND_PATHS[trend]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

class UltStatDelta extends HTMLElement {
  static observedAttributes = ['tone', 'trend'];
  private delta: HTMLSpanElement | null = null;
  private glyph: SVGSVGElement | null = null;

  connectedCallback() {
    if (this.delta) return;
    const delta = document.createElement('span');
    delta.setAttribute('part', 'delta');
    while (this.firstChild) delta.appendChild(this.firstChild);
    this.appendChild(delta);
    this.delta = delta;
    this.sync();
  }

  attributeChangedCallback() {
    this.sync();
  }

  private sync() {
    const delta = this.delta;
    if (!delta) return;
    const tone = pick(this.getAttribute('tone'), TONES, 'neutral');
    delta.className = mergeStyles(styles.delta, deltaTones[tone]);
    this.glyph?.remove();
    this.glyph = null;
    const trend = this.getAttribute('trend');
    if (trend === 'up' || trend === 'down') {
      this.glyph = trendGlyph(trend);
      delta.insertBefore(this.glyph, delta.firstChild);
    }
  }
}

if (!customElements.get('ult-stat')) customElements.define('ult-stat', UltStat);
if (!customElements.get('ult-stat-label')) customElements.define('ult-stat-label', UltStatLabel);
if (!customElements.get('ult-stat-value')) customElements.define('ult-stat-value', UltStatValue);
if (!customElements.get('ult-stat-delta')) customElements.define('ult-stat-delta', UltStatDelta);
