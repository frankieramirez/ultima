import * as stylex from '@stylexjs/stylex';
import { color, space, text } from '@ultima/tokens/tokens.stylex';
import { Resizable } from '@ultima/ui';

const styles = stylex.create({
  bounds: { blockSize: '16rem' },
  pane: {
    alignItems: 'center',
    blockSize: '100%',
    color: color['--ult-color-text-subtle'],
    display: 'flex',
    fontSize: text['--ult-text-4'],
    justifyContent: 'center',
    padding: space['--ult-space-4'],
  },
});

export default function VerticalResizable() {
  return (
    <Resizable.Root
      orientation="vertical"
      panels={[{ id: 'preview' }, { id: 'output' }]}
      defaultSize={[70, 30]}
      style={styles.bounds}
    >
      <Resizable.Panel id="preview">
        <div {...stylex.props(styles.pane)}>Preview</div>
      </Resizable.Panel>
      <Resizable.Handle id="preview:output" aria-label="Resize output">
        <Resizable.HandleIndicator />
      </Resizable.Handle>
      <Resizable.Panel id="output">
        <div {...stylex.props(styles.pane)}>Output</div>
      </Resizable.Panel>
    </Resizable.Root>
  );
}
