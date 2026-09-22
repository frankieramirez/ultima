import { ArrowUUpLeftIcon, ArrowUUpRightIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import type { ShuffleVariation } from '@ultima/tokens';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, ToggleGroup } from '@ultima/ui';

import { keepOne } from './theme-studio-draft';

const styles = stylex.create({
  bar: { display: 'flex', flexDirection: 'column', flexShrink: 0, gap: space['--ult-space-5'] },
  row: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-4'] },
  history: { display: 'flex', gap: space['--ult-space-2'] },
  icon: { paddingInline: space['--ult-space-4'] },
  fingerprint: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    marginInlineStart: 'auto',
  },
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
        <Button onClick={onShuffle} variant="outline">
          Shuffle
        </Button>
        <div {...stylex.props(styles.history)}>
          <Button aria-label="Undo" disabled={!canUndo} onClick={onUndo} style={styles.icon} variant="ghost">
            <ArrowUUpLeftIcon aria-hidden />
          </Button>
          <Button aria-label="Redo" disabled={!canRedo} onClick={onRedo} style={styles.icon} variant="ghost">
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
          <ToggleGroup.Item value="subtle">Subtle</ToggleGroup.Item>
          <ToggleGroup.Item value="broad">Broad</ToggleGroup.Item>
        </ToggleGroup.Root>
        <span title="Theme state fingerprint" {...stylex.props(styles.fingerprint)}>
          seed {fingerprint}
        </span>
      </div>
    </div>
  );
}
