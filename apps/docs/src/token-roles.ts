const NEUTRAL: Record<string, string> = {
  surface: 'page and app background',
  'surface-raised': 'cards, panels, popovers',
  'surface-sunken': 'wells, inputs, code blocks',
  'surface-hover': 'rows and items on hover',
  'surface-active': 'component chrome at rest, such as a scrollbar thumb',
  'surface-overlay': 'glass tiles and scrims; the one token with alpha',
  text: 'body text',
  'text-muted': 'secondary text',
  'text-subtle': 'labels, captions, placeholders',
  'text-inverse': 'text on inverted surfaces',
  border: 'hairlines',
  'border-strong': 'input and control outlines',
  'border-focus': 'focus rings',
};

const HUE: Record<string, string> = {
  fill: 'solid fill at rest',
  hover: 'solid fill on hover',
  active: 'solid fill when pressed',
  subtle: 'tinted background for badges, callouts, chips',
  border: 'hairline in the hue, for a chip, callout, or panel edge',
  text: 'the hue as text on neutral or subtle surfaces',
  contrast: 'text on the solid fills',
};

const FILTER: Record<string, string> = {
  backdrop: 'scrim blur behind modal overlays',
};

const RADIUS: Record<string, string> = {
  xs: 'swatches, bars, indicator dots',
  sm: 'inline code, small insets',
  md: 'Button, Input, Select trigger, menu items',
  lg: 'Card, Dialog, popups',
  full: 'Badge and any pill',
};

const SPACE: Record<string, string> = {
  '1': 'hairline insets: a switch thumb, scrollbar padding',
  '2': 'meter and progress track height; tight gaps',
  '3': 'tooltip padding and small gaps',
  '4': 'control padding, gaps between items in a group',
  '5': 'scrollbar thickness; gaps between fields',
  '6': 'card padding, gaps between stacked blocks',
  '7': 'spacing between groups inside a panel',
  '8': 'spacing between blocks of a page',
  '9': 'the sm control height; section spacing',
  '10': 'the md control height',
  '11': 'the lg control height',
  '12': 'page rhythm between major regions',
};

const TEXT: Record<string, string> = {
  '1': 'uppercase micro-labels and kickers',
  '2': 'small labels, tooltips, meter labels',
  '3': 'dense UI text: badges, table cells, captions',
  '4': 'control text: buttons, inputs, menu items',
  '5': 'body text',
  '6': 'card and dialog titles',
  '7': 'subheadings',
  '8': 'section headings, stat values',
  '9': 'large figures and empty-state marks',
  '10': 'page titles on a phone',
  '11': 'display headings between sections',
  '12': 'page titles on a wide screen',
};

const FONT: Record<string, string> = {
  sans: 'interface and body text',
  mono: 'code, token names, tabular figures',
  'weight-regular': 'body text',
  'weight-medium': 'buttons, labels, the current item',
  'weight-semibold': 'titles and headings',
  'leading-none': 'single-line controls and icon rows',
  'leading-tight': 'headings and short labels',
  'leading-snug': 'dense lists and table rows',
  'leading-normal': 'body paragraphs',
  'leading-relaxed': 'long-form reading',
  'tracking-tightest': 'the largest display sizes',
  'tracking-tighter': 'display headings',
  'tracking-tight': 'page and section headings',
  'tracking-normal': 'body text and controls',
  'tracking-wide': 'uppercase micro-labels',
  'tracking-wider': 'spaced-out uppercase kickers',
};

const SHADOW: Record<string, string> = {
  sm: 'tooltips and small raised controls',
  md: 'menus, popovers, toasts',
  lg: 'dialogs and drawers',
};

const MOTION: Record<string, string> = {
  fast: 'hover, press, and small state changes',
  base: 'panels opening, collapsing, and resizing',
  slow: 'large surfaces entering the page',
  loop: 'one cycle of a repeating animation',
};

const GROUPS: [RegExp, Record<string, string>][] = [
  [/^--ult-space-(.+)$/, SPACE],
  [/^--ult-text-(.+)$/, TEXT],
  [/^--ult-font-(.+)$/, FONT],
  [/^--ult-radius-(.+)$/, RADIUS],
  [/^--ult-shadow-(.+)$/, SHADOW],
  [/^--ult-filter-(.+)$/, FILTER],
  [/^--ult-motion-(.+)$/, MOTION],
];

function hueSuffix(role: string): string {
  return role.includes('-') ? role.slice(role.lastIndexOf('-') + 1) : 'fill';
}

export function describeToken(token: string): string | undefined {
  for (const [pattern, roles] of GROUPS) {
    const key = pattern.exec(token)?.[1];
    if (key) return roles[key];
  }

  const color = /^--ult-color-(.+)$/.exec(token)?.[1];
  if (!color) return undefined;
  if (NEUTRAL[color]) return NEUTRAL[color];

  return HUE[hueSuffix(color)];
}
