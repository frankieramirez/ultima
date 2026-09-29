import { docsStyles } from './docs-style';
import { breakpoints } from './breakpoints.stylex';
import { ArrowUUpLeftIcon, ArrowUUpRightIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import type { ShuffleVariation } from '@ultima/tokens';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, ToggleGroup } from '@ultima/ui';

import { Kicker } from './page';
import { keepOne } from './theme-studio-draft';

const styles = stylex.create({
  touch: { minBlockSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null }, minInlineSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null } },
  bar: { display: 'flex', flexDirection: 'column', flexShrink: 0, gap: space['--ult-space-5'] },
  row: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-4'] },
  history: { display: 'flex', gap: space['--ult-space-2'] },
  icon: { paddingInline: space['--ult-space-4'] },
  fingerprint: { marginInlineStart: 'auto' },
});

export function ThemeStudioShuffleBar({
  canRedo,
  canUndo,
  fingerprint,
  onRedo,
  onShuffle,
  onUndo,
  onVariationChange,
  variation,
}: {
  canRedo: boolean;
  canUndo: boolean;
  fingerprint: string;
  onRedo: () => void;
  onShuffle: () => void;
  onUndo: () => void;
  onVariationChange: (variation: ShuffleVariation) => void;
  variation: ShuffleVariation;
}) {
  return (
    <div {...stylex.props(styles.bar)}>
      <div {...stylex.props(styles.row)}>
        <Button onClick={onShuffle} variant="outline" style={[docsStyles.square, styles.touch]}>
          Shuffle
        </Button>
        <div {...stylex.props(styles.history)}>
          <Button aria-label="Undo" disabled={!canUndo} onClick={onUndo} style={[docsStyles.square, styles.icon, styles.touch]} variant="ghost">
            <ArrowUUpLeftIcon aria-hidden />
          </Button>
          <Button aria-label="Redo" disabled={!canRedo} onClick={onRedo} style={[docsStyles.square, styles.icon, styles.touch]} variant="ghost">
            <ArrowUUpRightIcon aria-hidden />
          </Button>
        </div>
      </div>
      <div {...stylex.props(styles.row)}>
        <ToggleGroup.Root
          aria-label="Shuffle variation"
          onValueChange={(next, eventDetails) => {
            const selected = keepOne(next, () => eventDetails.cancel());
            if (selected) onVariationChange(selected as ShuffleVariation);
          }}
          value={[variation]}
        >
          <ToggleGroup.Item value="subtle" style={[docsStyles.square, styles.touch]}>Subtle</ToggleGroup.Item>
          <ToggleGroup.Item value="broad" style={[docsStyles.square, styles.touch]}>Broad</ToggleGroup.Item>
        </ToggleGroup.Root>
        <Kicker title="Theme state fingerprint" style={styles.fingerprint}>
          seed {fingerprint}
        </Kicker>
      </div>
    </div>
  );
}
