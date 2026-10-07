import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Card } from '@ultima/ui/card';
import { Meter } from '@ultima/ui/meter';
import { useId } from 'react';

import type { Range } from './dashboard-01';

type Product = { name: string; revenue: number };

const products: Record<Range, Product[]> = {
  7: [
    { name: 'Linen throw', revenue: 2240 },
    { name: 'Stoneware set', revenue: 1870 },
    { name: 'Oak side table', revenue: 1520 },
    { name: 'Brass lamp', revenue: 980 },
    { name: 'Wool rug', revenue: 860 },
  ],
  30: [
    { name: 'Linen throw', revenue: 9420 },
    { name: 'Oak side table', revenue: 7180 },
    { name: 'Stoneware set', revenue: 5960 },
    { name: 'Wool rug', revenue: 4310 },
    { name: 'Brass lamp', revenue: 3050 },
  ],
  90: [
    { name: 'Oak side table', revenue: 9860 },
    { name: 'Linen throw', revenue: 9540 },
    { name: 'Wool rug', revenue: 8120 },
    { name: 'Stoneware set', revenue: 7450 },
    { name: 'Brass lamp', revenue: 6980 },
  ],
};

const WHOLE_DOLLARS: Intl.NumberFormatOptions = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 };

const styles = stylex.create({
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-6'],
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  meter: {
    columnGap: space['--ult-space-4'],
    display: 'grid',
    gridTemplateAreas: '"label value" "track track"',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
  },
  label: {
    gridArea: 'label',
  },
  value: {
    gridArea: 'value',
  },
  track: {
    gridArea: 'track',
  },
});

export function TopProducts({ range }: { range: Range }) {
  const titleId = useId();
  return (
    <Card.Root render={<section aria-labelledby={titleId} />}>
      <Card.Header>
        <Card.Title id={titleId} render={<h2 />}>
          Top products
        </Card.Title>
      </Card.Header>
      <Card.Body>
        <ul {...stylex.props(styles.list)}>
          {products[range].map((product) => (
            <li key={product.name}>
              <Meter.Root value={product.revenue} max={10_000} locale="en-US" format={WHOLE_DOLLARS} style={styles.meter}>
                <Meter.Label style={styles.label}>{product.name}</Meter.Label>
                <Meter.Value style={styles.value} />
                <Meter.Track style={styles.track}>
                  <Meter.Indicator />
                </Meter.Track>
              </Meter.Root>
            </li>
          ))}
        </ul>
      </Card.Body>
    </Card.Root>
  );
}
