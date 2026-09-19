import * as stylex from '@stylexjs/stylex';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  root: {
    borderCollapse: 'collapse',
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
    width: '100%',
  },
  row: {
    backgroundColor: { default: 'transparent', ':hover': color['--ult-color-surface-hover'] },
  },
  headCell: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-wide'],
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-4'],
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  cell: {
    borderBlockEndColor: color['--ult-color-border'],
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: border.hairline,
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-4'],
  },
  scroll: {
    boxSizing: 'border-box',
    overflow: 'auto',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  caption: {
    captionSide: 'bottom',
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    padding: space['--ult-space-3'],
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

abstract class UltTablePart extends HTMLElement {
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
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  attributeChangedCallback(): void {
    if (this.inner) this.sync(this.inner);
  }

  protected abstract build(): HTMLElement;

  protected sync(_inner: HTMLElement): void {}

  protected childrenChanged(): void {}
}

class UltTable extends UltTablePart {
  protected override hostDisplay = 'block';

  protected build(): HTMLElement {
    const table = document.createElement('table');
    table.setAttribute('part', 'root');
    table.className = mergeStyles(styles.root);
    return table;
  }
}

const SCROLL_FORWARDED = ['aria-label', 'aria-labelledby'] as const;

class UltTableScroll extends UltTablePart {
  static observedAttributes = SCROLL_FORWARDED;
  protected override hostDisplay = 'block';
  private overflowObserver: ResizeObserver | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    const region = this.inner;
    if (!region) return;
    this.overflowObserver = new ResizeObserver(() => this.measure());
    this.overflowObserver.observe(region);
    this.watchContent();
    this.measure();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.overflowObserver?.disconnect();
    this.overflowObserver = null;
  }

  protected build(): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('part', 'scroll');
    region.setAttribute('role', 'region');
    region.className = mergeStyles(styles.scroll);
    region.tabIndex = -1;
    return region;
  }

  protected override sync(region: HTMLElement): void {
    for (const name of SCROLL_FORWARDED) forward(this, region, name);
  }

  protected override childrenChanged(): void {
    this.watchContent();
  }

  private watchContent(): void {
    const content = this.inner?.firstElementChild;
    if (!content) return;
    this.overflowObserver?.observe(content);
    const nested = content.firstElementChild;
    if (nested) this.overflowObserver?.observe(nested);
  }

  private measure(): void {
    const region = this.inner;
    if (!region) return;
    region.tabIndex = region.scrollWidth > region.clientWidth ? 0 : -1;
  }
}

class UltTableHead extends UltTablePart {
  protected build(): HTMLElement {
    return document.createElement('thead');
  }
}

class UltTableBody extends UltTablePart {
  protected build(): HTMLElement {
    return document.createElement('tbody');
  }
}

class UltTableRow extends UltTablePart {
  protected build(): HTMLElement {
    const row = document.createElement('tr');
    row.setAttribute('part', 'row');
    row.className = mergeStyles(styles.row);
    return row;
  }
}

const HEAD_CELL_FORWARDED = ['scope', 'colspan', 'rowspan', 'headers', 'abbr'] as const;

class UltTableHeadCell extends UltTablePart {
  static observedAttributes = [...HEAD_CELL_FORWARDED, 'sort'];

  protected build(): HTMLElement {
    const cell = document.createElement('th');
    cell.setAttribute('part', 'head-cell');
    cell.className = mergeStyles(styles.headCell);
    return cell;
  }

  protected override sync(cell: HTMLElement): void {
    for (const name of HEAD_CELL_FORWARDED) forward(this, cell, name);
    if (!cell.hasAttribute('scope')) cell.setAttribute('scope', 'col');
    const sort = this.getAttribute('sort');
    if (sort) {
      cell.setAttribute('aria-sort', sort);
      cell.setAttribute('data-sort', sort);
    } else {
      cell.removeAttribute('aria-sort');
      cell.removeAttribute('data-sort');
    }
  }
}

class UltTableSortButton extends UltTablePart {
  static observedAttributes = ['type'];

  protected build(): HTMLElement {
    return document.createElement('button');
  }

  protected override sync(button: HTMLElement): void {
    button.setAttribute('type', this.getAttribute('type') ?? 'button');
  }
}

const CELL_FORWARDED = ['colspan', 'rowspan', 'headers'] as const;

class UltTableCell extends UltTablePart {
  static observedAttributes = CELL_FORWARDED;

  protected build(): HTMLElement {
    const cell = document.createElement('td');
    cell.setAttribute('part', 'cell');
    cell.className = mergeStyles(styles.cell);
    return cell;
  }

  protected override sync(cell: HTMLElement): void {
    for (const name of CELL_FORWARDED) forward(this, cell, name);
  }
}

class UltTableCaption extends UltTablePart {
  static observedAttributes = ['id'];

  connectedCallback(): void {
    super.connectedCallback();
    this.place();
  }

  protected build(): HTMLElement {
    const caption = document.createElement('caption');
    caption.setAttribute('part', 'caption');
    caption.className = mergeStyles(styles.caption);
    return caption;
  }

  // The id a caller puts on the host belongs to the hoisted caption, so
  // aria-labelledby on the scroll region resolves its text.
  protected override sync(caption: HTMLElement): void {
    const id = this.getAttribute('id');
    if (id) {
      caption.setAttribute('id', id);
      this.removeAttribute('id');
    }
  }

  // A caption names the table only as its direct child, so the inner caption
  // leaves this host and takes the first slot of the nearest table.
  private place(): void {
    const caption = this.inner;
    const table = this.closest('table');
    if (caption && table && caption.parentElement !== table) {
      table.insertBefore(caption, table.firstChild);
    }
  }
}

if (!customElements.get('ult-table')) customElements.define('ult-table', UltTable);
if (!customElements.get('ult-table-scroll'))
  customElements.define('ult-table-scroll', UltTableScroll);
if (!customElements.get('ult-table-head')) customElements.define('ult-table-head', UltTableHead);
if (!customElements.get('ult-table-body')) customElements.define('ult-table-body', UltTableBody);
if (!customElements.get('ult-table-row')) customElements.define('ult-table-row', UltTableRow);
if (!customElements.get('ult-table-head-cell'))
  customElements.define('ult-table-head-cell', UltTableHeadCell);
if (!customElements.get('ult-table-sort-button'))
  customElements.define('ult-table-sort-button', UltTableSortButton);
if (!customElements.get('ult-table-cell')) customElements.define('ult-table-cell', UltTableCell);
if (!customElements.get('ult-table-caption'))
  customElements.define('ult-table-caption', UltTableCaption);
