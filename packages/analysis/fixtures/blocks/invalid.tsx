import * as stylex from '@stylexjs/stylex';
import { scaleLinear } from 'd3-scale';
import { color, space } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui/button';

const styles = stylex.create({
  region: {
    gap: '18px',
    padding: space['--ult-space-6'],
    backgroundColor: color['--ult-color-surface-raised'],
  },
});

export function Region() {
  return (
    <section className="region" {...stylex.props(styles.region)}>
      <Button>{scaleLinear().domain([0, 1]).range([0, 1])(1)}</Button>
      <button type="button">Raw</button>
      <div>
        <option>Loose</option>
      </div>
    </section>
  );
}
