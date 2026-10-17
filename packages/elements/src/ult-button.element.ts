import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text } from '@ultima/tokens/tokens.stylex';

const HOVER = '@media (hover: hover)';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    appearance: 'none',
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    cursor: { default: 'pointer', ':is([data-disabled])': 'default' },
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: font['--ult-font-sans'],
    fontWeight: font['--ult-font-weight-medium'],
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    textDecoration: 'none',
    touchAction: 'manipulation',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color, box-shadow, color, translate',
    transitionTimingFunction: easing.standard,
    translate: { default: '0 0', ':active:not([data-disabled])': `0 ${border.hairline}` },
    userSelect: 'none',
    whiteSpace: 'nowrap',
    WebkitTapHighlightColor: 'transparent',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
});

// Hover answers only on devices that hover, so a tapped button doesn't stay lit; press answers
// everywhere and moves one step past hover. `:not([data-disabled])` keeps a disabled button
// still, and a disabled button takes the muted fill and ink instead of fading.
const solid = stylex.create({
  accent: {
    backgroundColor: {
      default: color['--ult-color-accent'],
      ':active:not([data-disabled])': color['--ult-color-accent-active'],
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-accent-hover'],
        ':active:not([data-disabled])': color['--ult-color-accent-active'],
      },
    },
    borderColor: 'transparent',
    color: { default: color['--ult-color-accent-contrast'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
  danger: {
    backgroundColor: {
      default: color['--ult-color-danger'],
      ':active:not([data-disabled])': color['--ult-color-danger-active'],
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-danger-hover'],
        ':active:not([data-disabled])': color['--ult-color-danger-active'],
      },
    },
    borderColor: 'transparent',
    color: { default: color['--ult-color-danger-contrast'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
});

const soft = stylex.create({
  accent: {
    backgroundColor: {
      default: color['--ult-color-accent-subtle'],
      ':active:not([data-disabled])': color['--ult-color-accent-subtle-active'],
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-accent-subtle-hover'],
        ':active:not([data-disabled])': color['--ult-color-accent-subtle-active'],
      },
    },
    borderColor: 'transparent',
    color: { default: color['--ult-color-accent-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
  danger: {
    backgroundColor: {
      default: color['--ult-color-danger-subtle'],
      ':active:not([data-disabled])': color['--ult-color-danger-subtle-active'],
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-danger-subtle-hover'],
        ':active:not([data-disabled])': color['--ult-color-danger-subtle-active'],
      },
    },
    borderColor: 'transparent',
    color: { default: color['--ult-color-danger-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
});

// The outline lifts on `shadow-xs` and sets it down on press. Its edge only decorates, since the
// label identifies the button, so it stays on the quiet `border`.
const outline = stylex.create({
  accent: {
    backgroundColor: {
      default: 'transparent',
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      ':active:not([data-disabled])': color['--ult-color-surface-active'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-surface-hover'],
        ':active:not([data-disabled])': color['--ult-color-surface-active'],
      },
    },
    borderColor: color['--ult-color-border'],
    boxShadow: {
      default: shadow['--ult-shadow-xs'],
      ':active:not([data-disabled])': 'none',
      ':is([data-disabled])': 'none',
    },
    color: { default: color['--ult-color-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
  danger: {
    backgroundColor: {
      default: 'transparent',
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      ':active:not([data-disabled])': color['--ult-color-danger-subtle-hover'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-danger-subtle'],
        ':active:not([data-disabled])': color['--ult-color-danger-subtle-hover'],
      },
    },
    borderColor: { default: color['--ult-color-danger-border'], ':is([data-disabled])': color['--ult-color-border'] },
    boxShadow: {
      default: shadow['--ult-shadow-xs'],
      ':active:not([data-disabled])': 'none',
      ':is([data-disabled])': 'none',
    },
    color: { default: color['--ult-color-danger-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
});

const ghost = stylex.create({
  accent: {
    backgroundColor: {
      default: 'transparent',
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      ':active:not([data-disabled])': color['--ult-color-surface-active'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-surface-hover'],
        ':active:not([data-disabled])': color['--ult-color-surface-active'],
      },
    },
    borderColor: 'transparent',
    color: { default: color['--ult-color-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
  danger: {
    backgroundColor: {
      default: 'transparent',
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      ':active:not([data-disabled])': color['--ult-color-danger-subtle-hover'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-danger-subtle'],
        ':active:not([data-disabled])': color['--ult-color-danger-subtle-hover'],
      },
    },
    borderColor: 'transparent',
    color: { default: color['--ult-color-danger-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
});

const variants = { solid, soft, outline, ghost };

// A button that holds an icon gives up one space step on each side, so the icon doesn't sit
// further from the edge than the label does. `paddingInline` stays one property, so the
// icon-only recipe's `paddingInline: 0` in the style slot replaces it whole.
const sizes = stylex.create({
  sm: {
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-3'],
    height: space['--ult-space-9'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: { default: space['--ult-space-5'], ':has(> svg)': space['--ult-space-4'] },
  },
  md: {
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-4'],
    height: space['--ult-space-10'],
    paddingBlock: space['--ult-space-4'],
    paddingInline: { default: space['--ult-space-6'], ':has(> svg)': space['--ult-space-5'] },
  },
  lg: {
    fontSize: text['--ult-text-5'],
    gap: space['--ult-space-4'],
    height: space['--ult-space-11'],
    paddingBlock: space['--ult-space-5'],
    paddingInline: { default: space['--ult-space-7'], ':has(> svg)': space['--ult-space-6'] },
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

const VARIANTS = ['solid', 'soft', 'outline', 'ghost'] as const;
const TONES = ['accent', 'danger'] as const;
const SIZES = ['sm', 'md', 'lg'] as const;

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function buttonClass(host: HTMLElement): string {
  const variant = pick(host.getAttribute('variant'), VARIANTS, 'solid');
  const tone = pick(host.getAttribute('tone'), TONES, 'accent');
  const size = pick(host.getAttribute('size'), SIZES, 'md');
  return mergeStyles(styles.root, variants[variant][tone], sizes[size]);
}

function applyState(host: HTMLElement, button: HTMLButtonElement | null) {
  if (!button) return;
  button.className = buttonClass(host);
  const disabled = host.hasAttribute('disabled');
  button.disabled = disabled;
  if (disabled) button.setAttribute('data-disabled', '');
  else button.removeAttribute('data-disabled');
}

class UltButton extends HTMLElement {
  static observedAttributes = ['variant', 'tone', 'size', 'disabled'];
  private button: HTMLButtonElement | null = null;

  connectedCallback() {
    if (this.button) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('part', 'root');
    while (this.firstChild) button.appendChild(this.firstChild);
    this.appendChild(button);
    this.button = button;
    applyState(this, button);
  }

  attributeChangedCallback() {
    applyState(this, this.button);
  }
}

if (!customElements.get('ult-button')) customElements.define('ult-button', UltButton);
