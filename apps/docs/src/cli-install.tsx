import { BookOpenIcon, CheckIcon, WebhooksLogoIcon, XIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Card } from '@ultima/ui';
import type { ReactNode } from 'react';

import { breakpoints } from './breakpoints.stylex';
import { foundationStyles } from './foundation';

const styles = stylex.create({
  grid: {
    display: 'grid',
    gap: space['--ult-space-6'],
    listStyle: 'none',
    marginBlock: space['--ult-space-7'],
    marginInline: 0,
    padding: 0,
  },
  two: { gridTemplateColumns: { default: 'minmax(0, 1fr)', [breakpoints.WIDE]: 'repeat(2, minmax(0, 1fr))' } },
  three: { gridTemplateColumns: { default: 'minmax(0, 1fr)', [breakpoints.WIDE]: 'repeat(3, minmax(0, 1fr))' } },
  card: { blockSize: '100%' },
  body: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-5'], paddingBlockStart: space['--ult-space-6'] },
  icon: { color: color['--ult-color-text'], fontSize: text['--ult-text-6'] },
  title: {
    fontFamily: 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif',
    fontSize: text['--ult-text-6'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    margin: 0,
  },
  description: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  files: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-4'], margin: 0 },
  harness: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-2'] },
  path: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
    margin: 0,
    overflowWrap: 'anywhere',
  },
  features: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-4'], listStyle: 'none', margin: 0, padding: 0 },
  feature: { alignItems: 'center', display: 'flex', fontSize: text['--ult-text-4'], gap: space['--ult-space-4'] },
  has: { color: color['--ult-color-text'] },
  lacks: { color: color['--ult-color-text-subtle'] },
  mark: { flexShrink: 0 },
  updates: { color: color['--ult-color-text-muted'], fontSize: text['--ult-text-3'], margin: 0 },
});

export const INSTALL_WRITES = [
  {
    title: 'The ultima-design skill',
    icon: <BookOpenIcon />,
    description: 'What your agent reads before UI work: where the hosted guide lives and which command to run at each step.',
    files: [
      { harness: 'Claude Code', path: '.claude/skills/ultima-design/SKILL.md' },
      { harness: 'Codex, Cursor and Copilot', path: '.agents/skills/ultima-design/SKILL.md' },
    ],
  },
  {
    title: 'One post-edit hook per harness',
    icon: <WebhooksLogoIcon />,
    description: 'Each hook runs check on the file your agent just edited and hands the findings back in the same turn.',
    files: [
      { harness: 'Claude Code', path: '.claude/settings.json' },
      { harness: 'Codex', path: '.codex/hooks.json' },
      { harness: 'Cursor', path: '.cursor/hooks.json' },
      { harness: 'Copilot', path: '.github/hooks/ultima.json' },
    ],
  },
];

export function InstallWrites() {
  return (
    <ul {...stylex.props(styles.grid, styles.two)}>
      {INSTALL_WRITES.map(({ title, icon, description, files }) => (
        <li key={title}>
          <Card.Root style={styles.card}>
            <Card.Body style={styles.body}>
              <span aria-hidden {...stylex.props(styles.icon)}>
                {icon}
              </span>
              <h3 {...stylex.props(styles.title)}>{title}</h3>
              <p {...stylex.props(styles.description)}>{description}</p>
              <dl {...stylex.props(styles.files)}>
                {files.map(({ harness, path }) => (
                  <div key={path}>
                    <dt {...stylex.props(styles.harness)}>{harness}</dt>
                    <dd {...stylex.props(styles.path)}>{path}</dd>
                  </div>
                ))}
              </dl>
            </Card.Body>
          </Card.Root>
        </li>
      ))}
    </ul>
  );
}

const FEATURES = ['Skill', 'Post-edit hooks', 'Checks in CI'] as const;

const ROUTES: { title: string; has: (typeof FEATURES)[number][]; updates: ReactNode }[] = [
  { title: 'CLI', has: ['Skill', 'Post-edit hooks', 'Checks in CI'], updates: 'Upgrade the CLI, then rerun install' },
  { title: 'skills.sh', has: ['Skill'], updates: 'Through skills.sh' },
  { title: 'Claude Code', has: ['Skill'], updates: 'Through the plugin marketplace' },
];

export function SkillRoutes() {
  return (
    <ul {...stylex.props(styles.grid, styles.three)}>
      {ROUTES.map(({ title, has, updates }) => (
        <li key={title}>
          <Card.Root style={styles.card}>
            <Card.Body style={styles.body}>
              <h3 {...stylex.props(styles.title)}>{title}</h3>
              <ul {...stylex.props(styles.features)}>
                {FEATURES.map((feature) => {
                  const included = has.includes(feature);
                  const Mark = included ? CheckIcon : XIcon;
                  return (
                    <li key={feature} {...stylex.props(styles.feature, included ? styles.has : styles.lacks)}>
                      <Mark role="img" aria-label={included ? 'Included:' : 'Not included:'} {...stylex.props(styles.mark)} />
                      {feature}
                    </li>
                  );
                })}
              </ul>
              <p {...stylex.props(styles.updates)}>
                <span {...stylex.props(foundationStyles.label)}>Updates</span> {updates}
              </p>
            </Card.Body>
          </Card.Root>
        </li>
      ))}
    </ul>
  );
}
