import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, relativeText, space, text } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  root: {
    backgroundColor: color['--ult-color-surface-sunken'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-mono'],
    margin: 0,
  },
});

const variants = stylex.create({
  inline: {
    borderRadius: radius['--ult-radius-sm'],
    fontSize: relativeText.code,
    paddingBlock: space['--ult-space-1'],
    paddingInline: space['--ult-space-2'],
  },
  block: {
    borderColor: color['--ult-color-border'],
    borderRadius: 0,
    borderStyle: 'solid',
    borderWidth: border.hairline,
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    overflowWrap: 'anywhere',
    padding: space['--ult-space-7'],
    whiteSpace: 'pre-wrap',
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

const VARIANTS = ['inline', 'block'] as const;
type Variant = (typeof VARIANTS)[number];

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

class UltCode extends HTMLElement {
  static observedAttributes = ['variant'];
  private rendered: Variant | null = null;

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  private render() {
    const variant = pick(this.getAttribute('variant'), VARIANTS, 'inline');
    if (variant === this.rendered) return;
    const content = this.content();
    this.replaceChildren();
    if (variant === 'block') {
      const pre = document.createElement('pre');
      pre.setAttribute('part', 'root');
      pre.className = mergeStyles(styles.root, variants.block);
      const code = document.createElement('code');
      code.append(...content);
      pre.appendChild(code);
      this.appendChild(pre);
    } else {
      const code = document.createElement('code');
      code.setAttribute('part', 'root');
      code.className = mergeStyles(styles.root, variants.inline);
      code.append(...content);
      this.appendChild(code);
    }
    this.rendered = variant;
  }

  private content(): Node[] {
    const inner = this.firstElementChild;
    if (!inner) return [...this.childNodes];
    const source = inner.tagName === 'PRE' ? (inner.firstElementChild ?? inner) : inner;
    return [...source.childNodes];
  }
}

if (!customElements.get('ult-code')) customElements.define('ult-code', UltCode);
