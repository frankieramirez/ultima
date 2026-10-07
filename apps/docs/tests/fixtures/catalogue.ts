/**
 * Plain values the catalogue.filter-and-demo production binding reads: the filter queries, the result it
 * opens and the demo whose source the copy control must write. Data only; bump `version` when a value
 * changes so a report names the fixture it ran.
 */
export const catalogue = {
  version: 3,
  groups: ['Forms', 'Overlays', 'Data display', 'Navigation', 'Feedback', 'Layout'],
  /** Matches more than one entry by name or description, and not the whole catalogue. */
  broadQuery: 'dialog',
  broadMatch: 'Dialog',
  /** The only group with a match for `broadQuery`; every other group is hidden. */
  broadGroups: ['Overlays'],
  /** Matches nothing. */
  emptyQuery: 'zzzz no such part',
  emptyHeading: 'No components match these filters',
  /** A group chip whose group holds at least one component that ships an element, and not every one. */
  chip: 'Overlays',
  switchLabel: 'Has an HTML element',
  /** Narrows the list to the entry the keyboard opens. */
  openQuery: 'button',
  open: { name: 'Button', pathname: '/components/button' },
  /** The first demo on the opened page, as a path from the docs app root. */
  demo: { source: 'src/demos/button/variants.tsx', control: 'Solid' },
  copyLabel: 'Copy example source',
} as const;
