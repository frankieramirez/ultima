import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';

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
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    textDecoration: 'none',
    touchAction: 'manipulation',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color, color',
    transitionTimingFunction: easing.standard,
    userSelect: 'none',
    whiteSpace: 'nowrap',
    WebkitTapHighlightColor: 'transparent',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
});

// A disabled button still matches `:hover` and `:active`, so each pointer value is restated
// inside `[data-disabled]` at its resting value: the dimmed button does not answer the pointer.
const solid = stylex.create({
  accent: {
    backgroundColor: {
      default: color['--ult-color-accent'],
      ':hover': color['--ult-color-accent-hover'],
      ':active': color['--ult-color-accent-active'],
      ':is([data-disabled])': {
        default: color['--ult-color-accent'],
        ':hover': color['--ult-color-accent'],
        ':active': color['--ult-color-accent'],
      },
    },
    borderColor: 'transparent',
    color: color['--ult-color-accent-contrast'],
  },
  danger: {
    backgroundColor: {
      default: color['--ult-color-danger'],
      ':hover': color['--ult-color-danger-hover'],
      ':active': color['--ult-color-danger-active'],
      ':is([data-disabled])': {
        default: color['--ult-color-danger'],
        ':hover': color['--ult-color-danger'],
        ':active': color['--ult-color-danger'],
      },
    },
    borderColor: 'transparent',
    color: color['--ult-color-danger-contrast'],
  },
});

const outline = stylex.create({
  accent: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-surface-hover'],
      ':active': color['--ult-color-surface-active'],
      ':is([data-disabled])': { default: 'transparent', ':hover': 'transparent', ':active': 'transparent' },
    },
    borderColor: color['--ult-color-border'],
    color: color['--ult-color-text'],
  },
  danger: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-danger-subtle'],
      ':is([data-disabled])': { default: 'transparent', ':hover': 'transparent' },
    },
    borderColor: color['--ult-color-danger-border'],
    color: color['--ult-color-danger-text'],
  },
});

const ghost = stylex.create({
  accent: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-surface-hover'],
      ':active': color['--ult-color-surface-active'],
      ':is([data-disabled])': { default: 'transparent', ':hover': 'transparent', ':active': 'transparent' },
    },
    borderColor: 'transparent',
    color: {
      default: color['--ult-color-text-muted'],
      ':hover': color['--ult-color-text'],
      ':is([data-disabled])': { default: color['--ult-color-text-muted'], ':hover': color['--ult-color-text-muted'] },
    },
  },
  danger: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-danger-subtle'],
      ':is([data-disabled])': { default: 'transparent', ':hover': 'transparent' },
    },
    borderColor: 'transparent',
    color: color['--ult-color-danger-text'],
  },
});

const variants = { solid, outline, ghost };

const sizes = stylex.create({
  sm: {
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-3'],
    height: space['--ult-space-9'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-5'],
  },
  md: {
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-4'],
    height: space['--ult-space-10'],
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-6'],
  },
  lg: {
    fontSize: text['--ult-text-5'],
    gap: space['--ult-space-4'],
    height: space['--ult-space-11'],
    paddingBlock: space['--ult-space-5'],
    paddingInline: space['--ult-space-7'],
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

const VARIANTS = ['solid', 'outline', 'ghost'] as const;
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
