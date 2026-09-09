const NEUTRAL: Record<string, string> = {
  surface: 'page and app background',
  'surface-raised': 'cards, panels, popovers',
  'surface-sunken': 'wells, inputs, code blocks',
  'surface-hover': 'rows and items on hover',
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

const RADIUS: Record<string, string> = {
  xs: 'swatches, bars, indicator dots',
  sm: 'inline code, small insets',
  md: 'Button, Input, Select trigger, menu items',
  lg: 'Card, Dialog, popups',
  full: 'Badge and any pill',
};

function hueSuffix(role: string): string {
  return role.includes('-') ? role.slice(role.lastIndexOf('-') + 1) : 'fill';
}

export function describeToken(token: string): string | undefined {
  const radius = /^--ult-radius-(.+)$/.exec(token)?.[1];
  if (radius) return RADIUS[radius];

  const color = /^--ult-color-(.+)$/.exec(token)?.[1];
  if (!color) return undefined;
  if (NEUTRAL[color]) return NEUTRAL[color];

  return HUE[hueSuffix(color)];
}
