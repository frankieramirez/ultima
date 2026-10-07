import { docsStyles } from './docs-style';
import { breakpoints } from './breakpoints.stylex';
import { ArrowUUpLeftIcon, ArrowUUpRightIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import type { ShuffleVariation } from '@ultima/tokens';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, ToggleGroup } from '@ultima/ui';
import { useId } from 'react';

import { Kicker } from './page';
import { keepOne } from './theme-studio-draft';

const OPTIONS = [
  { value: 'broad', label: 'Broad', description: 'Explore new color, spacing and type combinations.' },
  { value: 'subtle', label: 'Subtle', description: 'Small changes to your current theme.' },
] as const;

const styles = stylex.create({
  touch: { minBlockSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null }, minInlineSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null } },
  bar: { display: 'flex', flexDirection: 'column', flexShrink: 0, gap: space['--ult-space-5'] },
  row: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-4'] },
  history: { display: 'flex', gap: space['--ult-space-2'] },
  icon: { paddingInline: space['--ult-space-4'] },
  fingerprint: { marginInlineStart: 'auto' },
  action: { flexGrow: 1 },
  railOnlyHint: { color: color['--ult-color-text-subtle'], display: { default: 'none', [breakpoints.RAIL]: 'block' }, fontSize: text['--ult-text-2'], lineHeight: font['--ult-font-leading-snug'], margin: 0 },
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
  const hintId = useId();
  return (
    <div {...stylex.props(styles.bar)}>
      <div {...stylex.props(styles.row)}>
        <Button onClick={onShuffle} variant="outline" style={[docsStyles.square, styles.touch, styles.action]}>Shuffle</Button>
        <ToggleGroup.Root
          aria-describedby={hintId}
          aria-label="Shuffle variation"
          onValueChange={(next, eventDetails) => {
            const selected = keepOne(next, () => eventDetails.cancel());
            if (selected) onVariationChange(selected as ShuffleVariation);
          }}
          value={[variation]}
        >
          {OPTIONS.map((option) => (
            <ToggleGroup.Item key={option.value} value={option.value} style={[docsStyles.square, styles.touch]}>
              {option.label}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </div>
      <p id={hintId} {...stylex.props(styles.railOnlyHint)}>{OPTIONS.find((option) => option.value === variation)?.description}</p>
      <div {...stylex.props(styles.row)}>
        <div {...stylex.props(styles.history)}>
          <Button aria-label="Undo" disabled={!canUndo} onClick={onUndo} size="sm" style={[docsStyles.square, styles.icon, styles.touch]} variant="ghost"><ArrowUUpLeftIcon aria-hidden /></Button>
          <Button aria-label="Redo" disabled={!canRedo} onClick={onRedo} size="sm" style={[docsStyles.square, styles.icon, styles.touch]} variant="ghost"><ArrowUUpRightIcon aria-hidden /></Button>
        </div>
        <Kicker title="Theme state fingerprint" style={styles.fingerprint}>seed {fingerprint}</Kicker>
      </div>
    </div>
  );
}
