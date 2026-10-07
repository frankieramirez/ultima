'use client';

import * as stylex from '@stylexjs/stylex';
import { color, font, space } from '@ultima/tokens/tokens.stylex';
import { Separator } from '@ultima/ui/separator';

import { BrandPanel } from './brand-panel';
import { SignInForm } from './sign-in-form';

const DESKTOP = '@media (min-width: 48rem)';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: { default: 'flex', [DESKTOP]: 'grid' },
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    gridTemplateColumns: 'minmax(0, 7fr) auto minmax(0, 8fr)',
    minBlockSize: '100dvh',
  },
  divider: {
    display: { default: 'none', [DESKTOP]: 'block' },
  },
  main: {
    alignItems: { default: 'stretch', [DESKTOP]: 'center' },
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    justifyContent: { default: 'flex-start', [DESKTOP]: 'center' },
    padding: { default: space['--ult-space-6'], [DESKTOP]: space['--ult-space-11'] },
  },
});

export function SignIn01() {
  return (
    <div {...stylex.props(styles.root)}>
      <BrandPanel />
      <Separator orientation="vertical" style={styles.divider} />
      <main {...stylex.props(styles.main)}>
        <SignInForm />
      </main>
    </div>
  );
}
