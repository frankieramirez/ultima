import * as stylex from '@stylexjs/stylex';
import { color, space, text } from '@ultima/tokens/tokens.stylex';
import { Resizable } from '@ultima/ui';

const styles = stylex.create({
  bounds: { blockSize: '12rem' },
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

export default function CollapsibleResizable() {
  return (
    <Resizable.Root
      panels={[
        { id: 'files', collapsible: true, collapsedSize: 0, minSize: 15 },
        { id: 'editor' },
      ]}
      style={styles.bounds}
    >
      <Resizable.Panel id="files">
        <div {...stylex.props(styles.pane)}>Files</div>
      </Resizable.Panel>
      <Resizable.Handle id="files:editor" aria-label="Resize files">
        <Resizable.HandleIndicator />
      </Resizable.Handle>
      <Resizable.Panel id="editor">
        <div {...stylex.props(styles.pane)}>Editor</div>
      </Resizable.Panel>
    </Resizable.Root>
  );
}
