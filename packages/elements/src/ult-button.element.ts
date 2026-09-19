import * as stylex from '@stylexjs/stylex';
import { border, color, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';

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
    fontFamily: font['--ult-font-sans'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-4'],
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    textDecoration: 'none',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color, color',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
});

const solid = stylex.create({
  accent: {
    backgroundColor: {
      default: color['--ult-color-accent'],
      ':hover': color['--ult-color-accent-hover'],
      ':active': color['--ult-color-accent-active'],
    },
    borderColor: 'transparent',
    color: color['--ult-color-accent-contrast'],
  },
  danger: {
    backgroundColor: {
      default: color['--ult-color-danger'],
      ':hover': color['--ult-color-danger-hover'],
      ':active': color['--ult-color-danger-active'],
    },
    borderColor: 'transparent',
    color: color['--ult-color-danger-contrast'],
  },
});

const outline = stylex.create({
  accent: {
    backgroundColor: { default: 'transparent', ':hover': color['--ult-color-surface-raised'] },
    borderColor: color['--ult-color-border'],
    color: color['--ult-color-text'],
  },
  danger: {
    backgroundColor: { default: 'transparent', ':hover': color['--ult-color-danger-subtle'] },
    borderColor: color['--ult-color-danger-border'],
    color: color['--ult-color-danger-text'],
  },
});

const ghost = stylex.create({
  accent: {
    backgroundColor: { default: 'transparent', ':hover': color['--ult-color-surface-raised'] },
    borderColor: 'transparent',
    color: color['--ult-color-text-muted'],
  },
  danger: {
    backgroundColor: { default: 'transparent', ':hover': color['--ult-color-danger-subtle'] },
    borderColor: 'transparent',
    color: color['--ult-color-danger-text'],
  },
});

const variants = { solid, outline, ghost };

const sizes = stylex.create({
  sm: {
    fontSize: text['--ult-text-3'],
    height: space['--ult-space-9'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
  },
  md: {
    fontSize: text['--ult-text-4'],
    height: space['--ult-space-10'],
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-5'],
  },
  lg: {
    fontSize: text['--ult-text-5'],
    height: space['--ult-space-11'],
    paddingBlock: space['--ult-space-5'],
    paddingInline: space['--ult-space-6'],
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
