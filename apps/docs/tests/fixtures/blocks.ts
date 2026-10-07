/**
 * Plain values the blocks.preview production binding reads: the block it opens from the index by
 * keyboard, and the window the narrow toggle gives the framed block. Data only; bump `version` when a
 * value changes so a report names the fixture it ran.
 */
export const blocksFixture = {
  version: 1,
  open: { id: 'sign-in-01', title: 'Sign-in 01', install: 'npx shadcn add @ultima/sign-in-01' },
  copyLabel: 'Copy install command',
  desktop: { width: 1200, height: 760 },
  narrow: { width: 390, height: 844 },
} as const;
