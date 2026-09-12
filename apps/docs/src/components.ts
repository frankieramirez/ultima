export type ComponentEntry = {
  name: string;
  item: string;
  description: string;
};

export const components = [
  {
    name: 'Button',
    item: 'button',
    description: 'A button in three variants, three sizes, and two tones, on Base UI.',
  },
  { name: 'Badge', item: 'badge', description: 'A small static label in two variants and six tones.' },
  {
    name: 'Card',
    item: 'card',
    description: 'A surface with a header, body, and footer for grouping related content.',
  },
  {
    name: 'Table',
    item: 'table',
    description: 'A data table as native table parts, with an optional caption and scroll region.',
  },
  {
    name: 'Tabs',
    item: 'tabs',
    description: 'Tabbed sections in an underline or a segmented variant, on Base UI.',
  },
  { name: 'Meter', item: 'meter', description: 'A bounded measurement as a toned bar, on Base UI.' },
  { name: 'Stat', item: 'stat', description: 'A single number with its label, for dashboards and summaries.' },
  { name: 'Code', item: 'code', description: 'Monospaced code, inline in a sentence or as a block.' },
  {
    name: 'Tooltip',
    item: 'tooltip',
    description: 'A short overlay on hover or focus, labelled through aria-label on its trigger.',
  },
  {
    name: 'Dialog',
    item: 'dialog',
    description: 'A modal overlay with a title, a description, and a close slot rendered by the caller.',
  },
  {
    name: 'Dropdown Menu',
    item: 'dropdown-menu',
    description: 'A keyboard-navigable menu with items, submenus, and selection controls, on Base UI.',
  },
  {
    name: 'Select',
    item: 'select',
    description: 'A selection control in three sizes with keyboard navigation and typeahead, on Base UI.',
  },
  { name: 'Input', item: 'input', description: 'A text input in three sizes, on Base UI.' },
  { name: 'Switch', item: 'switch', description: 'An on-off toggle with a sliding thumb, on Base UI.' },
  {
    name: 'Sidebar',
    item: 'sidebar',
    description: 'A collapsible navigation panel with groups, nested lists, and an active-page indication.',
  },
  {
    name: 'Collapsible',
    item: 'collapsible',
    description: 'A disclosure that animates its panel open and closed, on Base UI.',
  },
  {
    name: 'Toggle Group',
    item: 'toggle-group',
    description: 'A segmented group of toggle buttons with roving focus, on Base UI.',
  },
  { name: 'Separator', item: 'separator', description: 'A horizontal or vertical divider between sections of content.' },
] satisfies ComponentEntry[];
