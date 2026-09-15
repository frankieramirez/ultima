import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Slider } from '@ultima/ui';

const styles = stylex.create({
  root: {
    display: 'grid',
    gap: space['--ult-space-3'],
    gridTemplateColumns: '1fr auto',
    maxWidth: `calc(6 * ${space['--ult-space-12']})`,
  },
  control: {
    gridColumn: '1 / -1',
  },
  value: {
    justifySelf: 'end',
  },
});

export default function Volume() {
  return (
    <Slider.Root defaultValue={40} style={styles.root}>
      <Slider.Label>Volume</Slider.Label>
      <Slider.Value style={styles.value} />
      <Slider.Control style={styles.control}>
        <Slider.Track>
          <Slider.Indicator />
          <Slider.Thumb />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}
