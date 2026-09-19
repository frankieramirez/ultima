import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  root: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    margin: 0,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-2'],
    padding: space['--ult-space-6'],
  },
  title: {
    fontSize: text['--ult-text-6'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  description: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
  },
  body: {
    paddingBlockEnd: space['--ult-space-6'],
    paddingInline: space['--ult-space-6'],
  },
  footer: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
    paddingBlockEnd: space['--ult-space-6'],
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

abstract class UltCardPart extends HTMLElement {
  private target: HTMLElement | null = null;

  connectedCallback() {
    if (this.target) return;
    const target = this.renderTarget();
    while (this.firstChild) target.appendChild(this.firstChild);
    this.appendChild(target);
    this.target = target;
  }

  protected abstract renderTarget(): HTMLElement;
}

class UltCard extends UltCardPart {
  protected renderTarget() {
    const root = document.createElement('div');
    root.className = mergeStyles(styles.root);
    root.setAttribute('part', 'root');
    return root;
  }
}

class UltCardHeader extends UltCardPart {
  protected renderTarget() {
    const header = document.createElement('div');
    header.className = mergeStyles(styles.header);
    header.setAttribute('part', 'header');
    return header;
  }
}

class UltCardTitle extends UltCardPart {
  protected renderTarget() {
    const title = document.createElement('h3');
    title.className = mergeStyles(styles.title);
    title.setAttribute('part', 'title');
    return title;
  }
}

class UltCardDescription extends UltCardPart {
  protected renderTarget() {
    const description = document.createElement('div');
    description.className = mergeStyles(styles.description);
    description.setAttribute('part', 'description');
    return description;
  }
}

class UltCardBody extends UltCardPart {
  protected renderTarget() {
    const body = document.createElement('div');
    body.className = mergeStyles(styles.body);
    body.setAttribute('part', 'body');
    return body;
  }
}

class UltCardFooter extends UltCardPart {
  protected renderTarget() {
    const footer = document.createElement('div');
    footer.className = mergeStyles(styles.footer);
    footer.setAttribute('part', 'footer');
    return footer;
  }
}

if (!customElements.get('ult-card')) customElements.define('ult-card', UltCard);
if (!customElements.get('ult-card-header'))
  customElements.define('ult-card-header', UltCardHeader);
if (!customElements.get('ult-card-title')) customElements.define('ult-card-title', UltCardTitle);
if (!customElements.get('ult-card-description'))
  customElements.define('ult-card-description', UltCardDescription);
if (!customElements.get('ult-card-body')) customElements.define('ult-card-body', UltCardBody);
if (!customElements.get('ult-card-footer'))
  customElements.define('ult-card-footer', UltCardFooter);
