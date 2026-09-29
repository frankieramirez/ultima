import { docsStyles } from './docs-style';
import { breakpoints } from './breakpoints.stylex';
import { ArrowUUpLeftIcon, ArrowUUpRightIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import type { ShuffleVariation } from '@ultima/tokens';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Select } from '@ultima/ui';
import { useContext } from 'react';
import { StudioPortalContext } from './theme-studio-context';

import { Kicker } from './page';
const OPTIONS = [
  { value: 'subtle', label: 'Subtle', description: 'Small changes to your current theme.' },
  { value: 'broad', label: 'Broad', description: 'Explore new color, spacing and type combinations.' },
];

const styles = stylex.create({
  touch: { minBlockSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null }, minInlineSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null } },
  bar: { display: 'flex', flexDirection: 'column', flexShrink: 0, gap: space['--ult-space-5'] },
  row: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-4'] },
  history: { display: 'flex', gap: space['--ult-space-2'] },
  icon: { paddingInline: space['--ult-space-4'] },
  fingerprint: { marginInlineStart: 'auto' },
  action: { flexGrow: 1 },
  variation: { minInlineSize: '6rem' },
  choice: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-1'], paddingBlock: space['--ult-space-3'] },
  hint: { color: color['--ult-color-text-muted'], fontSize: text['--ult-text-4'], lineHeight: font['--ult-font-leading-normal'], margin: 0 },
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
  const container = useContext(StudioPortalContext);
  return (
    <div {...stylex.props(styles.bar)}>
      <div {...stylex.props(styles.row)}>
        <Button onClick={onShuffle} variant="outline" style={[docsStyles.square, styles.touch, styles.action]}>Shuffle</Button>
        <Select.Root items={OPTIONS} value={variation} onValueChange={(next) => { if (next) onVariationChange(next as ShuffleVariation); }}>
          <Select.Trigger aria-label="Shuffle variation" style={[docsStyles.square, styles.touch, styles.variation]}><Select.Value /><Select.Icon /></Select.Trigger>
          <Select.Portal container={container}><Select.Positioner><Select.Popup>
            <Select.List>{OPTIONS.map((option) => <Select.Item key={option.value} value={option.value}>
              <Select.ItemIndicator /><Select.ItemText><span {...stylex.props(styles.choice)}><span>{option.label}</span><span {...stylex.props(styles.hint)}>{option.description}</span></span></Select.ItemText>
            </Select.Item>)}</Select.List>
          </Select.Popup></Select.Positioner></Select.Portal>
        </Select.Root>
      </div>
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
