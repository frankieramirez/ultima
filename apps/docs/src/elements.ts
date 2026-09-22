/**
 * The element catalogue as the docs site reads it: one entry per registry item that also ships as a
 * custom element. Tags and attributes restate `packages/elements/src/ult-<item>.element.ts`; the
 * elements test holds the two together.
 */
export type ElementAttribute = {
  name: string;
  on: string;
  /** The allowed values, or a sentence when the attribute is free-form. */
  values: readonly string[] | string;
};

export type ElementEntry = {
  item: string;
  tag: string;
  /** Every tag the family defines, the root first. */
  tags: readonly string[];
  attributes: readonly ElementAttribute[];
  example: string;
};

export const ELEMENTS_BUNDLE = '/elements/ultima.js';

export const elements: readonly ElementEntry[] = [
  {
    item: 'button',
    tag: 'ult-button',
    tags: ['ult-button'],
    attributes: [
      { name: 'variant', on: 'ult-button', values: ['solid', 'outline', 'ghost'] },
      { name: 'size', on: 'ult-button', values: ['sm', 'md', 'lg'] },
      { name: 'tone', on: 'ult-button', values: ['accent', 'danger'] },
      { name: 'disabled', on: 'ult-button', values: 'Present or absent.' },
    ],
    example: [
      '<ult-button variant="solid" tone="accent">Save</ult-button>',
      '<ult-button variant="outline">Cancel</ult-button>',
      '<ult-button variant="ghost" size="sm">Dismiss</ult-button>',
      '<ult-button tone="danger" disabled>Delete</ult-button>',
    ].join('\n'),
  },
  {
    item: 'badge',
    tag: 'ult-badge',
    tags: ['ult-badge'],
    attributes: [
      { name: 'variant', on: 'ult-badge', values: ['subtle', 'solid'] },
      {
        name: 'tone',
        on: 'ult-badge',
        values: ['neutral', 'accent', 'highlight', 'success', 'warning', 'danger'],
      },
    ],
    example: [
      '<ult-badge tone="neutral">Draft</ult-badge>',
      '<ult-badge tone="success">Passing</ult-badge>',
      '<ult-badge variant="solid" tone="danger">Failing</ult-badge>',
    ].join('\n'),
  },
  {
    item: 'card',
    tag: 'ult-card',
    tags: [
      'ult-card',
      'ult-card-header',
      'ult-card-title',
      'ult-card-description',
      'ult-card-body',
      'ult-card-footer',
    ],
    attributes: [],
    example: [
      '<ult-card>',
      '  <ult-card-header>',
      '    <ult-card-title>Contrast gate</ult-card-title>',
      '    <ult-card-description>WCAG 2.2 AA, checked in both color modes.</ult-card-description>',
      '  </ult-card-header>',
      '  <ult-card-body>Every required text, border, and focus pairing clears the gate.</ult-card-body>',
      '  <ult-card-footer>',
      '    <ult-button variant="outline">Open report</ult-button>',
      '  </ult-card-footer>',
      '</ult-card>',
    ].join('\n'),
  },
  {
    item: 'table',
    tag: 'ult-table',
    tags: [
      'ult-table',
      'ult-table-scroll',
      'ult-table-caption',
      'ult-table-head',
      'ult-table-body',
      'ult-table-row',
      'ult-table-head-cell',
      'ult-table-sort-button',
      'ult-table-cell',
    ],
    attributes: [
      { name: 'aria-label, aria-labelledby', on: 'ult-table-scroll', values: 'Names the scroll region.' },
      {
        name: 'sort',
        on: 'ult-table-head-cell',
        values: 'An `aria-sort` value, mirrored to `data-sort` on the cell.',
      },
      {
        name: 'scope, colspan, rowspan, headers, abbr',
        on: 'ult-table-head-cell',
        values: 'Forwarded to the cell.',
      },
      { name: 'colspan, rowspan, headers', on: 'ult-table-cell', values: 'Forwarded to the cell.' },
    ],
    example: [
      '<ult-table-scroll aria-labelledby="latency">',
      '  <ult-table>',
      '    <ult-table-caption id="latency">Latency by region</ult-table-caption>',
      '    <ult-table-head>',
      '      <ult-table-row>',
      '        <ult-table-head-cell>Region</ult-table-head-cell>',
      '        <ult-table-head-cell sort="descending">p95</ult-table-head-cell>',
      '      </ult-table-row>',
      '    </ult-table-head>',
      '    <ult-table-body>',
      '      <ult-table-row>',
      '        <ult-table-cell>us-east-1</ult-table-cell>',
      '        <ult-table-cell>184ms</ult-table-cell>',
      '      </ult-table-row>',
      '      <ult-table-row>',
      '        <ult-table-cell>eu-west-1</ult-table-cell>',
      '        <ult-table-cell>240ms</ult-table-cell>',
      '      </ult-table-row>',
      '    </ult-table-body>',
      '  </ult-table>',
      '</ult-table-scroll>',
    ].join('\n'),
  },
  {
    item: 'tabs',
    tag: 'ult-tabs',
    tags: ['ult-tabs', 'ult-tabs-list', 'ult-tabs-tab', 'ult-tabs-panel', 'ult-tabs-indicator'],
    attributes: [
      { name: 'variant', on: 'ult-tabs', values: ['underline', 'segmented'] },
      { name: 'value', on: 'ult-tabs', values: 'The selected tab, matching a tab and panel `value`.' },
      { name: 'orientation', on: 'ult-tabs', values: ['horizontal', 'vertical'] },
      { name: 'dir', on: 'ult-tabs', values: ['ltr', 'rtl'] },
      { name: 'aria-label, aria-labelledby', on: 'ult-tabs-list', values: 'Names the tab list.' },
      { name: 'activate-on-focus, loop-focus', on: 'ult-tabs-list', values: 'Present or absent.' },
      { name: 'value', on: 'ult-tabs-tab', values: 'Pairs the tab with its panel.' },
      { name: 'disabled', on: 'ult-tabs-tab', values: 'Present or absent.' },
      { name: 'value', on: 'ult-tabs-panel', values: 'Pairs the panel with its tab.' },
    ],
    example: [
      '<ult-tabs value="overview">',
      '  <ult-tabs-list aria-label="Report views">',
      '    <ult-tabs-tab value="overview">Overview</ult-tabs-tab>',
      '    <ult-tabs-tab value="findings">Findings</ult-tabs-tab>',
      '    <ult-tabs-indicator></ult-tabs-indicator>',
      '  </ult-tabs-list>',
      '  <ult-tabs-panel value="overview">Overview of the latest audit.</ult-tabs-panel>',
      '  <ult-tabs-panel value="findings">Findings from the latest audit.</ult-tabs-panel>',
      '</ult-tabs>',
    ].join('\n'),
  },
  {
    item: 'meter',
    tag: 'ult-meter',
    tags: ['ult-meter', 'ult-meter-label', 'ult-meter-track', 'ult-meter-indicator', 'ult-meter-value'],
    attributes: [
      { name: 'value, min, max', on: 'ult-meter', values: 'Numbers; `min` defaults to 0 and `max` to 100.' },
      { name: 'tone', on: 'ult-meter', values: ['neutral', 'highlight', 'success', 'warning', 'danger'] },
      {
        name: 'aria-label, aria-labelledby, aria-describedby, aria-valuetext',
        on: 'ult-meter',
        values: 'Forwarded to the meter.',
      },
    ],
    example: [
      '<ult-meter value="70" tone="success" style="width: 16rem">',
      '  <ult-meter-label>Storage used</ult-meter-label>',
      '  <ult-meter-track><ult-meter-indicator></ult-meter-indicator></ult-meter-track>',
      '  <ult-meter-value></ult-meter-value>',
      '</ult-meter>',
    ].join('\n'),
  },
  {
    item: 'stat',
    tag: 'ult-stat',
    tags: ['ult-stat', 'ult-stat-label', 'ult-stat-value'],
    attributes: [],
    example: [
      '<ult-stat>',
      '  <ult-stat-label>Pairings pass</ult-stat-label>',
      '  <ult-stat-value>49</ult-stat-value>',
      '</ult-stat>',
    ].join('\n'),
  },
  {
    item: 'code',
    tag: 'ult-code',
    tags: ['ult-code'],
    attributes: [{ name: 'variant', on: 'ult-code', values: ['inline', 'block'] }],
    example: [
      '<p>Run <ult-code>npx shadcn add @ultima/button</ult-code> to install.</p>',
      '<ult-code variant="block">pnpm install',
      'pnpm dev</ult-code>',
    ].join('\n'),
  },
  {
    item: 'tooltip',
    tag: 'ult-tooltip',
    tags: [
      'ult-tooltip',
      'ult-tooltip-trigger',
      'ult-tooltip-positioner',
      'ult-tooltip-popup',
      'ult-tooltip-arrow',
    ],
    attributes: [{ name: 'open', on: 'ult-tooltip', values: 'Present or absent; forces the popup open.' }],
    example: [
      '<ult-tooltip>',
      '  <ult-tooltip-trigger>',
      '    <ult-button variant="outline" aria-label="Copied to clipboard">Copy</ult-button>',
      '  </ult-tooltip-trigger>',
      '  <ult-tooltip-positioner>',
      '    <ult-tooltip-popup>Copied to clipboard<ult-tooltip-arrow></ult-tooltip-arrow></ult-tooltip-popup>',
      '  </ult-tooltip-positioner>',
      '</ult-tooltip>',
    ].join('\n'),
  },
];

export function elementFor(item: string): ElementEntry {
  const entry = elements.find((element) => element.item === item);
  if (!entry) throw new Error(`no element ships for the "${item}" item`);
  return entry;
}

export function loadElements() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`script[src="${ELEMENTS_BUNDLE}"]`)) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = ELEMENTS_BUNDLE;
  document.head.append(script);
}
