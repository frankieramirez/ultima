import * as stylex from '@stylexjs/stylex';
import { font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui/button';
import { InputGroup } from '@ultima/ui/input-group';
import { Select } from '@ultima/ui/select';
import { Sidebar } from '@ultima/ui/sidebar';

import type { Range } from './dashboard-01';
import { CalendarGlyph, DownloadGlyph, SearchGlyph, SidebarGlyph } from './icons';

const DESKTOP = '@media (min-width: 48rem)';

const ranges: { label: string; value: Range }[] = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
];

const styles = stylex.create({
  bar: {
    alignItems: 'center',
    columnGap: space['--ult-space-5'],
    display: 'grid',
    gridTemplateAreas: {
      default: '"trigger title" "search search" "actions actions"',
      [DESKTOP]: '"trigger title search actions"',
    },
    gridTemplateColumns: {
      default: 'auto minmax(0, 1fr)',
      [DESKTOP]: `auto minmax(0, 1fr) minmax(0, calc(4 * ${space['--ult-space-12']})) auto`,
    },
    paddingBlock: space['--ult-space-5'],
    paddingInline: space['--ult-space-6'],
    rowGap: space['--ult-space-5'],
  },
  trigger: {
    gridArea: 'trigger',
  },
  title: {
    fontSize: text['--ult-text-6'],
    fontWeight: font['--ult-font-weight-semibold'],
    gridArea: 'title',
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  search: {
    gridArea: 'search',
  },
  actions: {
    display: 'flex',
    gap: space['--ult-space-5'],
    gridArea: 'actions',
  },
  range: {
    flexGrow: { default: 1, [DESKTOP]: 0 },
    gap: space['--ult-space-4'],
  },
});

type PageHeaderProps = {
  range: Range;
  onRangeChange: (range: Range) => void;
  query: string;
  onQueryChange: (query: string) => void;
};

export function PageHeader({ range, onRangeChange, query, onQueryChange }: PageHeaderProps) {
  return (
    <header {...stylex.props(styles.bar)}>
      <Sidebar.Trigger aria-label="Toggle navigation" render={<Button variant="ghost" size="sm" />} style={styles.trigger}>
        <SidebarGlyph />
      </Sidebar.Trigger>
      <h1 {...stylex.props(styles.title)}>Overview</h1>
      <InputGroup.Root style={styles.search}>
        <InputGroup.Addon>
          <SearchGlyph />
        </InputGroup.Addon>
        <InputGroup.Input
          type="search"
          aria-label="Search orders"
          placeholder="Search orders…"
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
        />
      </InputGroup.Root>
      <div {...stylex.props(styles.actions)}>
        <Select.Root items={ranges} value={range} onValueChange={(next) => next !== null && onRangeChange(next)}>
          <Select.Trigger aria-label="Date range" style={styles.range}>
            <CalendarGlyph />
            <Select.Value />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <Select.List>
                  {ranges.map((item) => (
                    <Select.Item key={item.value} value={item.value}>
                      <Select.ItemIndicator />
                      <Select.ItemText>{item.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
        <Button variant="outline">
          <DownloadGlyph />
          Export
        </Button>
      </div>
    </header>
  );
}
