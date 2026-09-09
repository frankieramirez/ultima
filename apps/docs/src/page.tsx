import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import type { ComponentProps, ReactNode } from 'react';

const styles = stylex.create({
  page: {
    marginInline: 'auto',
    maxWidth: '76rem',
    paddingBlock: space['--ult-space-9'],
    paddingInline: space['--ult-space-6'],
  },
  title: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-9'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  lede: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-5'],
    lineHeight: font['--ult-font-leading-normal'],
    marginBlock: space['--ult-space-5'],
    maxWidth: '44rem',
  },
  section: {
    marginBlockStart: space['--ult-space-11'],
  },
  sectionTitle: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    marginBlock: 0,
  },
  note: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    marginBlock: space['--ult-space-4'],
    maxWidth: '44rem',
  },
  link: {
    color: color['--ult-color-highlight-text'],
    textDecoration: 'underline',
    textUnderlineOffset: space['--ult-space-2'],
  },
});

export function Page({
  title,
  lede,
  children,
}: {
  title: string;
  lede: ReactNode;
  children: ReactNode;
}) {
  return (
    <main {...stylex.props(styles.page)}>
      <h1 {...stylex.props(styles.title)}>{title}</h1>
      <p {...stylex.props(styles.lede)}>{lede}</p>
      {children}
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section {...stylex.props(styles.section)}>
      <h2 {...stylex.props(styles.sectionTitle)}>{title}</h2>
      {children}
    </section>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p {...stylex.props(styles.note)}>{children}</p>;
}

export function TextLink(props: ComponentProps<'a'>) {
  return <a {...props} {...stylex.props(styles.link)} />;
}
