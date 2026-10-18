import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';

// A leading icon or status dot sits a space step from the label, and the badge gives up one step of
// inline padding on each side to hold it, as Button does: a mark is lighter than a word, so it would
// otherwise look further from the edge than the label does.
const styles = stylex.create({
  root: {
    alignItems: 'center',
    borderRadius: radius['--ult-radius-full'],
    borderStyle: 'solid',
    borderWidth: border.fine,
    boxSizing: 'border-box',
    display: 'inline-flex',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-2'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-2'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    paddingBlock: space['--ult-space-2'],
    paddingInline: {
      default: space['--ult-space-4'],
      ':has(> svg, > [data-ult-icon], > [data-ult-badge-dot])': space['--ult-space-3'],
    },
  },
  /** The x-height of the label's 12px, so it reads as a glyph in the line rather than an icon. */
  dot: {
    backgroundColor: 'currentColor',
    blockSize: space['--ult-space-3'],
    borderRadius: radius['--ult-radius-full'],
    flexShrink: 0,
    inlineSize: space['--ult-space-3'],
  },
});

const subtle = stylex.create({
  neutral: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderColor: 'transparent',
    color: color['--ult-color-text-muted'],
  },
  accent: {
    backgroundColor: color['--ult-color-accent-subtle'],
    borderColor: 'transparent',
    color: color['--ult-color-accent-text'],
  },
  highlight: {
    backgroundColor: color['--ult-color-highlight-subtle'],
    borderColor: 'transparent',
    color: color['--ult-color-highlight-text'],
  },
  success: {
    backgroundColor: color['--ult-color-success-subtle'],
    borderColor: 'transparent',
    color: color['--ult-color-success-text'],
  },
  warning: {
    backgroundColor: color['--ult-color-warning-subtle'],
    borderColor: 'transparent',
    color: color['--ult-color-warning-text'],
  },
  danger: {
    backgroundColor: color['--ult-color-danger-subtle'],
    borderColor: 'transparent',
    color: color['--ult-color-danger-text'],
  },
});

const solid = stylex.create({
  neutral: {
    backgroundColor: color['--ult-color-surface-hover'],
    borderColor: 'transparent',
    color: color['--ult-color-text'],
  },
  accent: {
    backgroundColor: color['--ult-color-accent'],
    borderColor: 'transparent',
    color: color['--ult-color-accent-contrast'],
  },
  highlight: {
    backgroundColor: color['--ult-color-highlight'],
    borderColor: 'transparent',
    color: color['--ult-color-highlight-contrast'],
  },
  success: {
    backgroundColor: color['--ult-color-success'],
    borderColor: 'transparent',
    color: color['--ult-color-success-contrast'],
  },
  warning: {
    backgroundColor: color['--ult-color-warning'],
    borderColor: 'transparent',
    color: color['--ult-color-warning-contrast'],
  },
  danger: {
    backgroundColor: color['--ult-color-danger'],
    borderColor: 'transparent',
    color: color['--ult-color-danger-contrast'],
  },
});

/** A decorative 0.5px edge in the tone's border step: the words carry the meaning, so the edge only draws the pill. */
const outline = stylex.create({
  neutral: {
    backgroundColor: 'transparent',
    borderColor: color['--ult-color-border'],
    color: color['--ult-color-text-muted'],
  },
  accent: {
    backgroundColor: 'transparent',
    borderColor: color['--ult-color-accent-border'],
    color: color['--ult-color-accent-text'],
  },
  highlight: {
    backgroundColor: 'transparent',
    borderColor: color['--ult-color-highlight-border'],
    color: color['--ult-color-highlight-text'],
  },
  success: {
    backgroundColor: 'transparent',
    borderColor: color['--ult-color-success-border'],
    color: color['--ult-color-success-text'],
  },
  warning: {
    backgroundColor: 'transparent',
    borderColor: color['--ult-color-warning-border'],
    color: color['--ult-color-warning-text'],
  },
  danger: {
    backgroundColor: 'transparent',
    borderColor: color['--ult-color-danger-border'],
    color: color['--ult-color-danger-text'],
  },
});

/** On a tint or no fill the dot takes the tone's solid step; on a solid fill it keeps the label's ink. */
const dotTones = stylex.create({
  neutral: { backgroundColor: color['--ult-color-text-subtle'] },
  accent: { backgroundColor: color['--ult-color-accent'] },
  highlight: { backgroundColor: color['--ult-color-highlight'] },
  success: { backgroundColor: color['--ult-color-success'] },
  warning: { backgroundColor: color['--ult-color-warning'] },
  danger: { backgroundColor: color['--ult-color-danger'] },
});

const variants = { subtle, solid, outline };

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

const VARIANTS = ['subtle', 'solid', 'outline'] as const;
const TONES = ['neutral', 'accent', 'highlight', 'success', 'warning', 'danger'] as const;

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function axes(host: HTMLElement) {
  return {
    variant: pick(host.getAttribute('variant'), VARIANTS, 'subtle'),
    tone: pick(host.getAttribute('tone'), TONES, 'neutral'),
  };
}

function badgeClass(host: HTMLElement): string {
  const { variant, tone } = axes(host);
  return mergeStyles(styles.root, variants[variant][tone]);
}

function dotClass(host: HTMLElement): string {
  const { variant, tone } = axes(host);
  return mergeStyles(styles.dot, variant !== 'solid' ? dotTones[tone] : undefined);
}

class UltBadge extends HTMLElement {
  static observedAttributes = ['variant', 'tone', 'dot'];
  private badge: HTMLSpanElement | null = null;
  private dot: HTMLSpanElement | null = null;

  connectedCallback() {
    if (this.badge) return;
    const badge = document.createElement('span');
    badge.setAttribute('part', 'root');
    while (this.firstChild) badge.appendChild(this.firstChild);
    this.appendChild(badge);
    this.badge = badge;
    this.sync();
  }

  attributeChangedCallback() {
    this.sync();
  }

  // A boolean `dot` attribute puts a decorative status dot before the label, as React's `dot` prop does.
  private sync() {
    const badge = this.badge;
    if (!badge) return;
    badge.className = badgeClass(this);
    if (this.hasAttribute('dot')) {
      if (!this.dot) {
        const dot = document.createElement('span');
        dot.setAttribute('part', 'dot');
        dot.setAttribute('aria-hidden', 'true');
        dot.setAttribute('data-ult-badge-dot', '');
        this.dot = dot;
      }
      if (badge.firstChild !== this.dot) badge.insertBefore(this.dot, badge.firstChild);
      this.dot.className = dotClass(this);
    } else if (this.dot) {
      this.dot.remove();
      this.dot = null;
    }
  }
}

if (!customElements.get('ult-badge')) customElements.define('ult-badge', UltBadge);
