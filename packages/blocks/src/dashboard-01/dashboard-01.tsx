'use client';

import * as stylex from '@stylexjs/stylex';
import { color, font, space } from '@ultima/tokens/tokens.stylex';
import { Separator } from '@ultima/ui/separator';
import { Sidebar } from '@ultima/ui/sidebar';
import { useState } from 'react';

import { AppSidebar } from './app-sidebar';
import { PageHeader } from './page-header';
import { RecentOrders } from './recent-orders';
import { RevenueChart } from './revenue-chart';
import { StatRow } from './stat-row';
import { TopProducts } from './top-products';

/** The date range the header's Select offers, in days. */
export type Range = 7 | 30 | 90;

const DESKTOP = '@media (min-width: 48rem)';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'flex',
    fontFamily: font['--ult-font-sans'],
    minBlockSize: '100dvh',
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minInlineSize: 0,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-6'],
    padding: space['--ult-space-6'],
  },
  split: {
    display: 'grid',
    gap: space['--ult-space-6'],
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [DESKTOP]: 'minmax(0, 2fr) minmax(0, 1fr)' },
  },
});

export function Dashboard01() {
  const [range, setRange] = useState<Range>(30);
  const [query, setQuery] = useState('');

  return (
    <Sidebar.Root style={styles.root}>
      <AppSidebar />
      <main {...stylex.props(styles.main)}>
        <PageHeader range={range} onRangeChange={setRange} query={query} onQueryChange={setQuery} />
        <Separator />
        <div {...stylex.props(styles.content)}>
          <StatRow range={range} />
          <div {...stylex.props(styles.split)}>
            <RevenueChart />
            <TopProducts range={range} />
          </div>
          <RecentOrders query={query} />
        </div>
      </main>
    </Sidebar.Root>
  );
}
