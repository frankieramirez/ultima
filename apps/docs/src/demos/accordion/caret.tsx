import * as stylex from '@stylexjs/stylex';
import { motion, space } from '@ultima/tokens/tokens.stylex';
import { Accordion } from '@ultima/ui';

const styles = stylex.create({
  body: {
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-4'],
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

export default function CaretAccordion() {
  return (
    <Accordion.Root>
      <Accordion.Item value="a">
        <Accordion.Header>
          <Accordion.Trigger
            render={(props, state) => (
              <button {...props}>
                Deployment log
                <Caret turned={state.open} />
              </button>
            )}
          />
        </Accordion.Header>
        <Accordion.Panel>
          <div {...stylex.props(styles.body)}>
            Built in 41s. Uploaded 62 assets. Published to production.
          </div>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
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
