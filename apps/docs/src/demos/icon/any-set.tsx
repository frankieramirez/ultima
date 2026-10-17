import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Icon } from '@ultima/ui';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-5'],
  },
});

/** Drawn the way many sets draw: a fixed 24px box and a 2px stroke. */
function Upload(props: React.ComponentProps<'svg'>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}

export default function AnySet() {
  return (
    <div {...stylex.props(styles.row)}>
      <Button variant="outline">
        <Upload />
        Without Icon
      </Button>
      <Button variant="outline">
        <Icon><Upload /></Icon>
        With Icon
      </Button>
    </div>
  );
}
