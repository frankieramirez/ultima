import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  root: {
    borderRadius: radius['--ult-radius-full'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    display: 'inline-flex',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-wide'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
  },
});

const subtle = stylex.create({
  neutral: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderColor: color['--ult-color-border'],
    color: color['--ult-color-text-muted'],
  },
  accent: {
    backgroundColor: color['--ult-color-accent-subtle'],
    borderColor: color['--ult-color-accent-border'],
    color: color['--ult-color-accent-text'],
  },
  highlight: {
    backgroundColor: color['--ult-color-highlight-subtle'],
    borderColor: color['--ult-color-highlight-border'],
    color: color['--ult-color-highlight-text'],
  },
  success: {
    backgroundColor: color['--ult-color-success-subtle'],
    borderColor: color['--ult-color-success-border'],
    color: color['--ult-color-success-text'],
  },
  warning: {
    backgroundColor: color['--ult-color-warning-subtle'],
    borderColor: color['--ult-color-warning-border'],
    color: color['--ult-color-warning-text'],
  },
  danger: {
    backgroundColor: color['--ult-color-danger-subtle'],
    borderColor: color['--ult-color-danger-border'],
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

const variants = { subtle, solid };

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

const VARIANTS = ['subtle', 'solid'] as const;
const TONES = ['neutral', 'accent', 'highlight', 'success', 'warning', 'danger'] as const;

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function badgeClass(host: HTMLElement): string {
  const variant = pick(host.getAttribute('variant'), VARIANTS, 'subtle');
  const tone = pick(host.getAttribute('tone'), TONES, 'neutral');
  return mergeStyles(styles.root, variants[variant][tone]);
}

class UltBadge extends HTMLElement {
  static observedAttributes = ['variant', 'tone'];
  private badge: HTMLSpanElement | null = null;

  connectedCallback() {
    if (this.badge) return;
    const badge = document.createElement('span');
    badge.setAttribute('part', 'root');
    while (this.firstChild) badge.appendChild(this.firstChild);
    this.appendChild(badge);
    this.badge = badge;
    badge.className = badgeClass(this);
  }

  attributeChangedCallback() {
    if (this.badge) this.badge.className = badgeClass(this);
  }
}

if (!customElements.get('ult-badge')) customElements.define('ult-badge', UltBadge);
