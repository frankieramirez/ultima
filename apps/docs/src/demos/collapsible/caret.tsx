import * as stylex from '@stylexjs/stylex';
import { motion, space } from '@ultima/tokens/tokens.stylex';
import { Button, Collapsible } from '@ultima/ui';

const styles = stylex.create({
  trigger: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: space['--ult-space-3'],
  },
  caret: {
    rotate: '0deg',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'rotate',
  },
  turned: {
    rotate: '90deg',
  },
});

export default function CaretCollapsible() {
  return (
    <Collapsible.Root>
      <Collapsible.Trigger
        render={(props, state) => (
          <Button {...props} style={styles.trigger} variant="ghost">
            <Caret turned={state.open} />
            Deployment log
          </Button>
        )}
      />
      <Collapsible.Panel>
        <p>Built in 41s. Uploaded 62 assets. Published to production.</p>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

function Caret({ turned }: { turned: boolean }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="12"
      viewBox="0 0 12 12"
      width="12"
      {...stylex.props(styles.caret, turned && styles.turned)}
    >
      <path d="M4.5 2.5 8 6l-3.5 3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}
