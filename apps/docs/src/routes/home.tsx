import { ArrowDownIcon, ArrowUpRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { palette, presetDraft, resolveDraft } from '@ultima/tokens';
import { color, easing, font, motion, space, text } from '@ultima/tokens/tokens.stylex';
import { Card, Separator, ToggleGroup } from '@ultima/ui';
import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';
import { useEffect, useState, type ReactNode } from 'react';

import { breakpoints } from '../breakpoints.stylex';
import { components } from '../components';
import { docsStyles } from '../docs-style';
import { INSTALL_TARGETS } from '../install-commands';
import { LandingCommand } from '../landing-command';
import { LandingIndex, type Preset } from '../landing-index';
import { ScaleBands } from '../landing-scales';
import { Kicker } from '../page';
import { SwatchChip } from '../swatch';
import { TextLink } from '../text-link';
import { useResolvedScheme } from '../theme';

const HEADING_FONT = 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif';

const DEFAULT_SETUP = INSTALL_TARGETS[0];

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export function countInWords(count: number): string {
  if (!Number.isInteger(count) || count < 1 || count > 99) return String(count);
  const words = count < 20 ? ONES[count]! : `${TENS[Math.floor(count / 10)]}${count % 10 ? `-${ONES[count % 10]}` : ''}`;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const rise = stylex.keyframes({
  from: { opacity: 0, transform: `translateY(${space['--ult-space-8']})` },
  to: { opacity: 1, transform: 'none' },
});

const styles = stylex.create({
  page: { display: 'flex', flexDirection: 'column', inlineSize: '100%' },
  gutter: { paddingInline: { default: space['--ult-space-7'], [breakpoints.WIDE]: space['--ult-space-12'] } },
  // The dot field (#679) mounts behind the hero's content: the section is its positioned, clipped ground.
  hero: {
    overflow: 'clip',
    paddingBlockEnd: { default: space['--ult-space-9'], [breakpoints.WIDE]: '6rem' },
    paddingBlockStart: { default: space['--ult-space-7'], [breakpoints.WIDE]: space['--ult-space-12'] },
    position: 'relative',
  },
  heroContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: { default: space['--ult-space-10'], [breakpoints.WIDE]: '3.5rem' },
    position: 'relative',
  },
  runningHead: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
  },
  runningRow: { display: 'flex', gap: space['--ult-space-6'], justifyContent: 'space-between' },
  wideOnly: { display: { default: 'none', [breakpoints.WIDE]: 'block' } },
  narrowOnly: { display: { default: 'block', [breakpoints.WIDE]: 'none' } },
  titleBlock: {
    alignItems: { default: 'stretch', [breakpoints.DESKTOP]: 'flex-end' },
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.DESKTOP]: 'row' },
    gap: { default: space['--ult-space-9'], [breakpoints.DESKTOP]: space['--ult-space-12'] },
    justifyContent: 'space-between',
  },
  headline: {
    containerType: 'inline-size',
    flexBasis: { default: 'auto', [breakpoints.DESKTOP]: 0 },
    flexGrow: 1,
    minInlineSize: 0,
  },
  heading: {
    color: color['--ult-color-text'],
    fontFamily: HEADING_FONT,
    fontSize: 'min(9.25rem, 15.5cqi)',
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: '-0.047em',
    lineHeight: 0.92,
    margin: 0,
  },
  highlight: { color: color['--ult-color-highlight'] },
  aside: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    gap: { default: space['--ult-space-7'], [breakpoints.DESKTOP]: '1.75rem' },
    inlineSize: { default: '100%', [breakpoints.DESKTOP]: '21.25rem' },
  },
  aim: {
    color: color['--ult-color-text-muted'],
    fontSize: { default: text['--ult-text-5'], [breakpoints.WIDE]: '1.0625rem' },
    lineHeight: 1.6,
    margin: 0,
  },
  actions: { display: 'flex', flexDirection: 'column' },
  action: {
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.9375rem',
    fontWeight: font['--ult-font-weight-medium'],
    justifyContent: 'space-between',
    minBlockSize: space['--ult-space-11'],
  },
  primaryAction: { color: color['--ult-color-text'], fontWeight: font['--ult-font-weight-semibold'] },
  reveal: {
    animationDuration: motion['--ult-motion-slow'],
    animationFillMode: 'backwards',
    animationName: rise,
    animationTimingFunction: easing.enter,
  },
  revealSecond: { animationDelay: motion['--ult-motion-fast'] },
  revealThird: { animationDelay: `calc(2 * ${motion['--ult-motion-fast']})` },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: { default: space['--ult-space-6'], [breakpoints.DESKTOP]: space['--ult-space-8'] },
  },
  sectionHead: {
    alignItems: { default: 'flex-start', [breakpoints.DESKTOP]: 'flex-end' },
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.DESKTOP]: 'row' },
    gap: { default: space['--ult-space-5'], [breakpoints.DESKTOP]: space['--ult-space-7'] },
  },
  sectionTitle: {
    color: color['--ult-color-text'],
    fontFamily: HEADING_FONT,
    fontSize: { default: '2rem', [breakpoints.DESKTOP]: '2.5rem' },
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: '-0.035em',
    lineHeight: 1.05,
    margin: 0,
  },
  palette: {
    paddingBlockEnd: space['--ult-space-8'],
    paddingBlockStart: { default: space['--ult-space-11'], [breakpoints.DESKTOP]: space['--ult-space-9'] },
  },
  paletteHead: {
    alignItems: { default: 'stretch', [breakpoints.DESKTOP]: 'flex-start' },
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.DESKTOP]: 'row' },
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
  },
  lede: {
    color: color['--ult-color-text-muted'],
    fontSize: '0.9375rem',
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    maxInlineSize: { default: 'none', [breakpoints.DESKTOP]: '23.75rem' },
  },
  presetRow: {
    alignItems: { default: 'flex-start', [breakpoints.WIDE]: 'center' },
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.WIDE]: 'row' },
    gap: space['--ult-space-6'],
  },
  presetItem: { gap: space['--ult-space-4'] },
  presetSwatch: { blockSize: '0.625rem', borderRadius: 0, inlineSize: '0.625rem' },
  studioLink: { alignItems: 'center', display: 'inline-flex', fontSize: text['--ult-text-3'], gap: space['--ult-space-2'] },
  index: {
    paddingBlock: { default: space['--ult-space-11'], [breakpoints.DESKTOP]: '8rem' },
  },
  indexHead: {
    alignItems: { default: 'flex-start', [breakpoints.DESKTOP]: 'flex-end' },
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.DESKTOP]: 'row' },
    flexWrap: 'wrap',
    gap: space['--ult-space-7'],
    justifyContent: 'space-between',
  },
  principlesCard: {
    borderInlineWidth: 0,
    borderRadius: 0,
    paddingBlockEnd: { default: space['--ult-space-12'], [breakpoints.DESKTOP]: '7.5rem' },
    paddingBlockStart: { default: space['--ult-space-11'], [breakpoints.DESKTOP]: '7rem' },
  },
  principles: {
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.DESKTOP]: 'row' },
    gap: { default: space['--ult-space-8'], [breakpoints.DESKTOP]: space['--ult-space-10'] },
  },
  principle: {
    display: 'flex',
    flexBasis: 0,
    flexDirection: 'column',
    flexGrow: 1,
    gap: { default: space['--ult-space-4'], [breakpoints.DESKTOP]: space['--ult-space-8'] },
  },
  ordinal: {
    color: color['--ult-color-text-subtle'],
    fontFamily: HEADING_FONT,
    fontSize: { default: '3rem', [breakpoints.DESKTOP]: '5.5rem' },
    letterSpacing: '-0.035em',
    lineHeight: 0.9,
  },
  principleTitle: {
    color: color['--ult-color-text'],
    fontFamily: HEADING_FONT,
    fontSize: { default: '1.375rem', [breakpoints.DESKTOP]: '1.75rem' },
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: '-0.028em',
    lineHeight: 1.15,
    margin: 0,
  },
  principleBody: {
    color: color['--ult-color-text-muted'],
    fontSize: '0.9375rem',
    lineHeight: 1.6,
    margin: 0,
  },
  dividerWide: { alignSelf: 'stretch', blockSize: 'auto', display: { default: 'none', [breakpoints.DESKTOP]: 'block' } },
  dividerNarrow: { display: { default: 'block', [breakpoints.DESKTOP]: 'none' } },
  colophon: {
    alignItems: { default: 'stretch', [breakpoints.DESKTOP]: 'flex-end' },
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.DESKTOP]: 'row' },
    gap: space['--ult-space-8'],
    justifyContent: 'space-between',
    paddingBlockEnd: { default: space['--ult-space-12'], [breakpoints.DESKTOP]: '6rem' },
    paddingBlockStart: { default: '4.5rem', [breakpoints.DESKTOP]: '7.5rem' },
  },
  colophonCopy: { display: 'flex', flexDirection: 'column', gap: '1.75rem', minInlineSize: 0 },
  closing: {
    color: color['--ult-color-text'],
    fontFamily: HEADING_FONT,
    fontSize: { default: '4rem', [breakpoints.DESKTOP]: '7.5rem' },
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: '-0.046em',
    lineHeight: 0.95,
    margin: 0,
  },
  colophonNotes: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-3'] },
});

const PRINCIPLES = [
  {
    title: 'Dark first. Light as a full peer.',
    body: 'Every token, every contrast check and every demo exists in both modes. Light is never an afterthought.',
  },
  {
    title: 'Tokens hold every raw value.',
    body: 'A literal in component code is a bug. A new need becomes a new token, so a theme reaches everything.',
  },
  {
    title: 'You own what you install.',
    body: 'The registry hands over the source and lets go. Change it, fork it, delete half of it.',
  },
];

let heroEnteredThisDocument = false;

function SectionHead({ mark, id, children }: { mark: string; id: string; children: ReactNode }) {
  return (
    <div {...stylex.props(styles.sectionHead)}>
      <Kicker>{mark}</Kicker>
      <h2 id={id} {...stylex.props(styles.sectionTitle)}>
        {children}
      </h2>
    </div>
  );
}

function PresetPreview({ preset, onChange }: { preset: Preset; onChange: (preset: Preset) => void }) {
  const mode = useResolvedScheme();
  const accent = (id: Preset) => resolveDraft(presetDraft(id))[mode]['--ult-color-accent']!;
  return (
    <div {...stylex.props(styles.presetRow)}>
      <Kicker id="preview-preset">PREVIEW PRESET</Kicker>
      <ToggleGroup.Root
        aria-labelledby="preview-preset"
        onValueChange={(next, eventDetails) => {
          const [chosen] = next;
          if (!chosen) {
            eventDetails.cancel();
            return;
          }
          onChange(chosen as Preset);
        }}
        value={[preset]}
      >
        {(['neutral', 'ultima'] as const).map((id) => (
          <ToggleGroup.Item key={id} value={id} style={[docsStyles.square, styles.presetItem]}>
            <SwatchChip value={accent(id)} style={styles.presetSwatch} />
            {id === 'neutral' ? 'Neutral' : 'Ultima'}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      <TextLink render={<Link to="/theme-studio" />} style={styles.studioLink}>
        Any color in Theme Studio <ArrowUpRightIcon aria-hidden />
      </TextLink>
    </div>
  );
}

export function Home() {
  const [reveal] = useState(() => !heroEnteredThisDocument);
  const [preset, setPreset] = useState<Preset>('neutral');
  useEffect(() => {
    heroEnteredThisDocument = true;
  }, []);
  const count = components.length;

  return (
    <main {...stylex.props(styles.page)}>
      <section aria-labelledby="hero-heading" data-hero {...stylex.props(styles.gutter, styles.hero)}>
        <div {...stylex.props(styles.heroContent)}>
          <div {...stylex.props(styles.runningHead, reveal && styles.reveal)}>
            <div {...stylex.props(styles.runningRow)}>
              <Kicker>ULTIMA · VOLUME ONE</Kicker>
              <Kicker style={styles.wideOnly}>REACT · STYLEX · BASE UI</Kicker>
              <Kicker style={styles.wideOnly}>
                {count} COMPONENTS / {palette.length} SCALES / 2 MODES
              </Kicker>
              <Kicker style={styles.narrowOnly}>
                <span aria-hidden>
                  {count} / {palette.length} / 2
                </span>
                <span {...stylex.props(visuallyHidden)}>
                  {count} components, {palette.length} scales, 2 modes
                </span>
              </Kicker>
            </div>
            <Separator />
          </div>
          <div {...stylex.props(styles.titleBlock)}>
            <div {...stylex.props(styles.headline)}>
              <h1 id="hero-heading" {...stylex.props(styles.heading, reveal && styles.reveal, reveal && styles.revealSecond)}>
                A system for <br />
                building <br />
                <span {...stylex.props(styles.highlight)}>interfaces.</span>
              </h1>
            </div>
            <div {...stylex.props(styles.aside, reveal && styles.reveal, reveal && styles.revealThird)}>
              <Kicker>§ 00</Kicker>
              <p {...stylex.props(styles.aim)}>
                {countInWords(count)} accessible React components, written in StyleX on Base UI behavior. You install the
                source, and it becomes yours to change.
              </p>
              <LandingCommand commands={DEFAULT_SETUP.commands} label={`Copy the ${DEFAULT_SETUP.label} install commands`} />
              <div {...stylex.props(styles.actions)}>
                <Separator />
                <TextLink variant="muted" render={<Link to="/" hash="index" />} style={[styles.action, styles.primaryAction]}>
                  Read the index <ArrowDownIcon aria-hidden />
                </TextLink>
                <Separator />
                <TextLink variant="muted" render={<Link to="/theme-studio" />} style={styles.action}>
                  Open Theme Studio <ArrowUpRightIcon aria-hidden />
                </TextLink>
                <Separator />
                <TextLink variant="muted" render={<Link to="/install" />} style={styles.action}>
                  Installation guide <ArrowUpRightIcon aria-hidden />
                </TextLink>
                <Separator />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="scales-heading">
        <div {...stylex.props(styles.gutter, styles.section, styles.palette)}>
          <div {...stylex.props(styles.paletteHead)}>
            <SectionHead mark="§ 01" id="scales-heading">
              Six scales, one job each.
            </SectionHead>
            <p {...stylex.props(styles.lede)}>
              Neutral keeps accent, focus and highlight achromatic. The Ultima preset adds an arcane accent and a mana
              highlight, and this site keeps the mana. Verdant, ember and ruin carry status in both. Preview a preset, or
              build one from any color in Theme Studio.
            </p>
          </div>
          <PresetPreview preset={preset} onChange={setPreset} />
        </div>
        <ScaleBands onPreviewAccent={() => setPreset('ultima')} />
      </section>

      <section id="index" aria-labelledby="index-heading" {...stylex.props(styles.gutter, styles.section, styles.index)}>
        <div {...stylex.props(styles.indexHead)}>
          <SectionHead mark="§ 02" id="index-heading">
            The index.
          </SectionHead>
        </div>
        <LandingIndex preset={preset} />
      </section>

      <section aria-labelledby="principles-heading">
        <Card.Root style={[styles.gutter, styles.section, styles.principlesCard]}>
          <SectionHead mark="§ 03" id="principles-heading">
            Three rules it keeps.
          </SectionHead>
          <div {...stylex.props(styles.principles)}>
            {PRINCIPLES.map((principle, index) => (
              <Principle key={principle.title} index={index} {...principle} />
            ))}
          </div>
        </Card.Root>
      </section>

      <section aria-labelledby="closing-heading" {...stylex.props(styles.gutter, styles.colophon)}>
        <div {...stylex.props(styles.colophonCopy)}>
          <h2 id="closing-heading" {...stylex.props(styles.closing)}>
            Begin with one.
          </h2>
          <LandingCommand commands={DEFAULT_SETUP.commands} label={`Copy the ${DEFAULT_SETUP.label} install commands`} />
        </div>
        <div {...stylex.props(styles.colophonNotes)}>
          <Kicker>SET IN SPACE GROTESK, FIGTREE AND IBM PLEX MONO.</Kicker>
          <Kicker>COLORS FROM THE GENERATOR.</Kicker>
          <Kicker>CONTRAST CHECKED AT BUILD.</Kicker>
        </div>
      </section>
    </main>
  );
}

function Principle({ index, title, body }: { index: number; title: string; body: string }) {
  return (
    <>
      {index > 0 ? (
        <>
          <Separator orientation="vertical" style={styles.dividerWide} />
          <Separator style={styles.dividerNarrow} />
        </>
      ) : null}
      <div {...stylex.props(styles.principle)}>
        <span aria-hidden {...stylex.props(styles.ordinal)}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <h3 {...stylex.props(styles.principleTitle)}>{title}</h3>
        <p {...stylex.props(styles.principleBody)}>{body}</p>
      </div>
    </>
  );
}
