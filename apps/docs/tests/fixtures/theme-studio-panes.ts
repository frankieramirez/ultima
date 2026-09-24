/**
 * Plain values the theme-studio.pane-boundaries production binding reads: the Compare panes, the
 * Overlays scene and the overlays each pane opens. The draft edit reuses the draft-history values. Data
 * only; bump `version` when a value changes so a report names the fixture it ran.
 */
export const paneBoundaries = {
  version: 1,
  panes: [
    { mode: 'dark', name: 'Dark preview' },
    { mode: 'light', name: 'Light preview' },
  ],
  scene: 'Overlays',
  overlays: [
    { trigger: 'Open overlay', dialog: 'Notes stay in this pane' },
    { trigger: 'Open dialog', dialog: 'Seal the bargain?' },
  ],
} as const;
