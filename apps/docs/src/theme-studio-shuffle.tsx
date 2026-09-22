import { ArrowUUpLeftIcon, ArrowUUpRightIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import type { ShuffleVariation } from '@ultima/tokens';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, ToggleGroup } from '@ultima/ui';

import { Kicker } from './page';
import { keepOne } from './theme-studio-draft';

const styles = stylex.create({
  bar: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
  history: {
    display: 'flex',
    gap: space['--ult-space-2'],
  },
  icon: {
    paddingInline: space['--ult-space-4'],
  },
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
      <Button onClick={onShuffle} size="sm">
        Shuffle
      </Button>
      <ToggleGroup.Root
        aria-label="Shuffle variation"
        onValueChange={(next, eventDetails) => {
          const selected = keepOne(next, () => eventDetails.cancel());
          if (selected) onVariationChange(selected as ShuffleVariation);
        }}
        value={[variation]}
      >
        <ToggleGroup.Item value="broad">Broad</ToggleGroup.Item>
        <ToggleGroup.Item value="subtle">Subtle</ToggleGroup.Item>
      </ToggleGroup.Root>
      <div {...stylex.props(styles.history)}>
        <Button
          aria-label="Undo"
          disabled={!canUndo}
          onClick={onUndo}
          size="sm"
          style={styles.icon}
          variant="ghost"
        >
          <ArrowUUpLeftIcon aria-hidden />
        </Button>
        <Button
          aria-label="Redo"
          disabled={!canRedo}
          onClick={onRedo}
          size="sm"
          style={styles.icon}
          variant="ghost"
        >
          <ArrowUUpRightIcon aria-hidden />
        </Button>
      </div>
      <Kicker title="Theme state fingerprint" style={styles.fingerprint}>
        seed {fingerprint}
      </Kicker>
    </div>
  );
}
