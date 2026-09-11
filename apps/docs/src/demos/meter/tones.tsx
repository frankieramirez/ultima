import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Meter, type MeterTone } from '@ultima/ui';

const tones: MeterTone[] = ['neutral', 'highlight', 'success', 'warning', 'danger'];

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-6'],
  },
});

export default function Tones() {
  return (
    <div {...stylex.props(styles.stack)}>
      {tones.map((tone, index) => (
        <Meter.Root key={tone} value={(index + 1) * 16} tone={tone}>
          <Meter.Label>{tone}</Meter.Label>
          <Meter.Track>
            <Meter.Indicator />
          </Meter.Track>
          <Meter.Value />
        </Meter.Root>
      ))}
    </div>
  );
}
