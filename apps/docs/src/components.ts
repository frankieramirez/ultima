export type ComponentRelease = 'v0' | 'v0.1' | 'v0.2';

export type ComponentEntry = {
  name: string;
  item: string;
  description: string;
  /** Docs-only. The index sections by this field; the menu stays a flat catalogue in release order. */
  release: ComponentRelease;
};

export const RELEASES = ['v0', 'v0.1', 'v0.2'] as const satisfies readonly ComponentRelease[];

export const RELEASE_LABELS: Record<ComponentRelease, string> = {
  v0: 'The v0 set',
  'v0.1': 'The v0.1 set',
  'v0.2': 'The v0.2 set',
};

export const components = [
  {
    name: 'Button',
    item: 'button',
    description: 'A button in three variants, three sizes, and two tones, on Base UI.',
    release: 'v0',
  },
  {
    name: 'Badge',
    item: 'badge',
    description: 'A small static label in two variants and six tones.',
    release: 'v0',
  },
  {
    name: 'Card',
    item: 'card',
    description: 'A surface with a header, body, and footer for grouping related content.',
    release: 'v0',
  },
  {
    name: 'Table',
    item: 'table',
    description: 'A data table as native table parts, with an optional caption and scroll region.',
    release: 'v0',
  },
  {
    name: 'Tabs',
    item: 'tabs',
    description: 'Tabbed sections in an underline or a segmented variant, on Base UI.',
    release: 'v0',
  },
  {
    name: 'Meter',
    item: 'meter',
    description: 'A bounded measurement as a toned bar, on Base UI.',
    release: 'v0',
  },
  {
    name: 'Stat',
    item: 'stat',
    description: 'A single number with its label, for dashboards and summaries.',
    release: 'v0',
  },
  {
    name: 'Code',
    item: 'code',
    description: 'Monospaced code, inline in a sentence or as a block.',
    release: 'v0',
  },
  {
    name: 'Tooltip',
    item: 'tooltip',
    description: 'A short overlay on hover or focus, labelled through aria-label on its trigger.',
    release: 'v0',
  },
  {
    name: 'Dialog',
    item: 'dialog',
    description: 'A modal overlay with a title, a description, and a close slot rendered by the caller.',
    release: 'v0',
  },
  {
    name: 'Dropdown Menu',
    item: 'dropdown-menu',
    description: 'A keyboard-navigable menu with items, submenus, and selection controls, on Base UI.',
    release: 'v0',
  },
  {
    name: 'Select',
    item: 'select',
    description: 'A selection control in three sizes with keyboard navigation and typeahead, on Base UI.',
    release: 'v0',
  },
  {
    name: 'Input',
    item: 'input',
    description: 'A text input in three sizes, on Base UI.',
    release: 'v0',
  },
  {
    name: 'Switch',
    item: 'switch',
    description: 'An on-off toggle with a sliding thumb, on Base UI.',
    release: 'v0',
  },
  {
    name: 'Sidebar',
    item: 'sidebar',
    description: 'A collapsible navigation panel with groups, nested lists, and an active-page indication.',
    release: 'v0',
  },
  {
    name: 'Collapsible',
    item: 'collapsible',
    description: 'A disclosure that animates its panel open and closed, on Base UI.',
    release: 'v0',
  },
  {
    name: 'Toggle Group',
    item: 'toggle-group',
    description: 'A segmented group of toggle buttons with roving focus, on Base UI.',
    release: 'v0',
  },
  {
    name: 'Separator',
    item: 'separator',
    description: 'A horizontal or vertical divider between sections of content.',
    release: 'v0',
  },
  {
    name: 'Field',
    item: 'field',
    description: 'A label, description, and error bound to one control, on Base UI.',
    release: 'v0.1',
  },
  {
    name: 'Fieldset',
    item: 'fieldset',
    description: 'A legend and related controls as a real fieldset, on Base UI.',
    release: 'v0.1',
  },
  {
    name: 'Checkbox',
    item: 'checkbox',
    description: 'A checkbox with a check, a dash for mixed, and an optional group, on Base UI.',
    release: 'v0.1',
  },
  {
    name: 'Radio Group',
    item: 'radio-group',
    description: 'A radio group with a filled-circle indicator, on Base UI.',
    release: 'v0.1',
  },
  {
    name: 'Textarea',
    item: 'textarea',
    description: 'A multiline text field in three sizes, on Base UI.',
    release: 'v0.1',
  },
  {
    name: 'Combobox',
    item: 'combobox',
    description: 'A filterable input whose value is restricted to the item set, on Base UI.',
    release: 'v0.1',
  },
  {
    name: 'Slider',
    item: 'slider',
    description: 'A value picker with one thumb per value and an accent fill, on Base UI.',
    release: 'v0.1',
  },
  {
    name: 'Alert',
    item: 'alert',
    description: 'A static in-page callout in six tones.',
    release: 'v0.1',
  },
  {
    name: 'Alert Dialog',
    item: 'alert-dialog',
    description: 'A confirmation overlay that Escape closes and a backdrop click does not, on Base UI.',
    release: 'v0.1',
  },
  {
    name: 'Toast',
    item: 'toast',
    description: 'A stacked notification in six tones, queued from a manager, on Base UI.',
    release: 'v0.1',
  },
  {
    name: 'Progress',
    item: 'progress',
    description: 'A task completion bar in five tones, determinate or indeterminate, on Base UI.',
    release: 'v0.1',
  },
  {
    name: 'Skeleton',
    item: 'skeleton',
    description: 'A sunken placeholder that pulses while its content loads.',
    release: 'v0.1',
  },
  {
    name: 'Spinner',
    item: 'spinner',
    description: 'A looping loading mark drawn in CSS, sized and colored by its surrounding text.',
    release: 'v0.1',
  },
  {
    name: 'Empty',
    item: 'empty',
    description: 'A centered placeholder for a collection with nothing in it.',
    release: 'v0.1',
  },
  {
    name: 'Breadcrumb',
    item: 'breadcrumb',
    description: 'A trail of links to the current page, with a swappable separator glyph.',
    release: 'v0.2',
  },
] satisfies ComponentEntry[];

export function componentsInRelease(release: ComponentRelease): ComponentEntry[] {
  return components.filter((entry) => entry.release === release);
}
