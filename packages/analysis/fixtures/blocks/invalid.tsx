import * as stylex from '@stylexjs/stylex';
import { scaleLinear } from 'd3-scale';
import { color, space } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui/button';
import { Card } from '@ultima/ui/card';
import { NativeSelect } from '@ultima/ui/native-select';
import { Select } from '@ultima/ui/select';
import type { ReactNode } from 'react';

const styles = stylex.create({
  region: {
    gap: '18px',
    padding: space['--ult-space-6'],
    backgroundColor: color['--ult-color-surface-raised'],
  },
});

const wrap = (node: ReactNode) => node;

export function Region() {
  return (
    <section className="region" {...stylex.props(styles.region)}>
      <Button>{scaleLinear().domain([0, 1]).range([0, 1])(1)}</Button>
      <button type="button">Raw</button>
      <div>
        <option>Loose</option>
      </div>
      <Select.Popup>
        <option>Listbox</option>
      </Select.Popup>
      <Card.Root>
        <option>Card</option>
      </Card.Root>
      <NativeSelect.Select aria-label="Wrapped">{wrap(<option>Wrapped</option>)}</NativeSelect.Select>
    </section>
  );
}
