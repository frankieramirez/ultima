import * as stylex from '@stylexjs/stylex';
'use client';

const styles = stylex.create({ root: { margin: 0 } });

function Separator({ style, ...rest }: import('@ultima/ui/lib/component').PlainProps<'hr'>) {
  return <hr {...rest} {...stylex.props(styles.root, style)} />;
}

export { Separator };
