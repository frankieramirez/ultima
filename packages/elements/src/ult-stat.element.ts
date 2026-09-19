import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';

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
    textTransform: 'uppercase',
  },
  value: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-8'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-none'],
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

if (!customElements.get('ult-stat')) customElements.define('ult-stat', UltStat);
if (!customElements.get('ult-stat-label')) customElements.define('ult-stat-label', UltStatLabel);
if (!customElements.get('ult-stat-value')) customElements.define('ult-stat-value', UltStatValue);
