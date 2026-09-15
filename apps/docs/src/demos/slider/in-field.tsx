import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Field, Slider } from '@ultima/ui';

const styles = stylex.create({
  field: {
    maxWidth: `calc(6 * ${space['--ult-space-12']})`,
  },
  control: {
    marginBlock: space['--ult-space-3'],
  },
});

export default function InField() {
  return (
    <Field.Root name="quality" style={styles.field}>
      <Field.Label nativeLabel={false} render={<span />}>
        Export quality
      </Field.Label>
      <Slider.Root defaultValue={60} step={10}>
        <Slider.Control style={styles.control}>
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <Field.Description>Higher quality takes longer to render.</Field.Description>
    </Field.Root>
  );
}
