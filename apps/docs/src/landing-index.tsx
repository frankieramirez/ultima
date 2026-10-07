import { ArrowDownIcon, ArrowRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme, presetDraft, resolveDraft } from '@ultima/tokens';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Card, Separator, ToggleGroup } from '@ultima/ui';
import { useMemo, useState, type CSSProperties } from 'react';

import { breakpoints } from './breakpoints.stylex';
import { CataloguePreview } from './catalogue-preview';
import { GROUPS, components, type ComponentEntry, type ComponentGroup } from './components';
import { docsStyles } from './docs-style';
import { LandingCommand } from './landing-command';
import { TextLink } from './text-link';
import { useResolvedScheme } from './theme';

export type Preset = 'neutral' | 'ultima';

const NARROW_ROWS = 8;

const styles = stylex.create({
  filter: { alignSelf: 'flex-start', flexWrap: 'wrap' },
  filterItem: { whiteSpace: 'nowrap' },
  body: {
    alignItems: 'flex-start',
    display: 'flex',
    gap: space['--ult-space-11'],
  },
  list: {
    columnCount: { default: 1, [breakpoints.WIDE]: 2, [breakpoints.DESKTOP]: 3 },
    columnGap: space['--ult-space-9'],
    flexGrow: 1,
    listStyle: 'none',
    margin: 0,
    minInlineSize: 0,
    padding: 0,
  },
  row: { breakInside: 'avoid' },
  folded: { display: { default: 'none', [breakpoints.WIDE]: 'block' } },
  link: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-6'],
    minBlockSize: space['--ult-space-11'],
  },
  current: { color: color['--ult-color-text'] },
  number: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
  },
  name: {
    flexGrow: 1,
    fontFamily: 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif',
    fontSize: text['--ult-text-6'],
    fontWeight: font['--ult-font-weight-medium'],
  },
  more: { display: { default: 'flex', [breakpoints.WIDE]: 'none' }, inlineSize: '100%' },
  plate: {
    display: { default: 'none', [breakpoints.INDEX]: 'flex' },
    flexDirection: 'column',
    flexShrink: 0,
    inlineSize: '25rem',
    overflow: 'hidden',
  },
  plateHead: {
    color: color['--ult-color-text-subtle'],
    display: 'flex',
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    justifyContent: 'space-between',
    letterSpacing: font['--ult-font-tracking-wide'],
    paddingBlock: space['--ult-space-5'],
    paddingInline: space['--ult-space-6'],
    textTransform: 'uppercase',
  },
  stage: {
    alignItems: 'center',
    blockSize: '18.75rem',
    display: 'flex',
    justifyContent: 'center',
    padding: space['--ult-space-9'],
  },
  stageInner: { color: color['--ult-color-text'], inlineSize: '100%' },
  notes: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-6'],
    padding: space['--ult-space-7'],
  },
  description: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  open: { alignSelf: 'flex-start' },
});

function presetVars(preset: Preset, mode: 'dark' | 'light'): CSSProperties {
  return resolveDraft(presetDraft(preset))[mode] as CSSProperties;
}

function Plate({ entry, preset }: { entry: ComponentEntry; preset: Preset }) {
  const mode = useResolvedScheme();
  const vars = useMemo(() => presetVars(preset, mode), [preset, mode]);
  const group = GROUPS.find((candidate) => candidate.id === entry.group)!;
  return (
    <Card.Root role="region" aria-label={`${entry.name} plate`} style={styles.plate}>
      <div {...stylex.props(styles.plateHead)}>
        <span>
          Plate {entry.number} · {entry.name}
        </span>
        <span>{group.label}</span>
      </div>
      <Separator />
      <div data-preset={preset} {...stylex.props(styles.stage, colorScheme[mode])} style={vars}>
        <div {...stylex.props(styles.stageInner)}>
          <CataloguePreview item={entry.item} />
        </div>
      </div>
      <Separator />
      <div {...stylex.props(styles.notes)}>
        <p {...stylex.props(styles.description)}>{entry.description}</p>
        <LandingCommand commands={[`npx shadcn add @ultima/${entry.item}`]} label={`Copy the ${entry.name} install command`} />
        <TextLink
          variant="muted"
          render={<Link to="/components/$name" params={{ name: entry.item }} />}
          style={styles.open}
        >
          Open {entry.name} <ArrowRightIcon aria-hidden />
        </TextLink>
      </div>
    </Card.Root>
  );
}

export function LandingIndex({ preset }: { preset: Preset }) {
  const [group, setGroup] = useState<ComponentGroup | 'all'>('all');
  const [current, setCurrent] = useState('dialog');
  const [unfolded, setUnfolded] = useState(false);
  const entries = useMemo(
    () => [...components].filter((entry) => group === 'all' || entry.group === group).sort((a, b) => a.number.localeCompare(b.number)),
    [group],
  );
  const shown = entries.find((entry) => entry.item === current) ?? entries[0]!;

  return (
    <>
      <ToggleGroup.Root
        aria-label="Filter the index"
        onValueChange={(next, eventDetails) => {
          const [chosen] = next;
          if (!chosen) {
            eventDetails.cancel();
            return;
          }
          setGroup(chosen as ComponentGroup | 'all');
        }}
        style={styles.filter}
        value={[group]}
      >
        <ToggleGroup.Item value="all" style={[docsStyles.square, styles.filterItem]}>
          All {components.length}
        </ToggleGroup.Item>
        {GROUPS.map((candidate) => (
          <ToggleGroup.Item key={candidate.id} value={candidate.id} style={[docsStyles.square, styles.filterItem]}>
            {candidate.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      <div {...stylex.props(styles.body)}>
        <ol aria-label="Components" {...stylex.props(styles.list)}>
          {entries.map((entry, index) => (
            <li key={entry.item} {...stylex.props(styles.row, !unfolded && index >= NARROW_ROWS && styles.folded)}>
              <TextLink
                variant="muted"
                render={<Link to="/components/$name" params={{ name: entry.item }} />}
                onFocus={() => setCurrent(entry.item)}
                onMouseEnter={() => setCurrent(entry.item)}
                style={[styles.link, entry.item === shown.item && styles.current]}
              >
                <span {...stylex.props(styles.number)}>{entry.number}</span>
                <span {...stylex.props(styles.name)}>{entry.name}</span>
                {entry.item === shown.item ? <ArrowRightIcon aria-hidden /> : null}
              </TextLink>
              <Separator />
            </li>
          ))}
        </ol>
        <Plate entry={shown} preset={preset} />
      </div>
      {!unfolded && entries.length > NARROW_ROWS ? (
        <Button variant="outline" size="lg" onClick={() => setUnfolded(true)} style={styles.more}>
          Show all {entries.length} components <ArrowDownIcon aria-hidden />
        </Button>
      ) : null}
    </>
  );
}
