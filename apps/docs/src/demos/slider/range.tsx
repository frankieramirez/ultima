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

export default function Range() {
  return (
    <Slider.Root defaultValue={[25, 75]} style={styles.root}>
      <Slider.Label>Price range</Slider.Label>
      <Slider.Value style={styles.value} />
      <Slider.Control style={styles.control}>
        <Slider.Track>
          <Slider.Indicator />
          <Slider.Thumb index={0} aria-label="Lowest price" />
          <Slider.Thumb index={1} aria-label="Highest price" />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}
