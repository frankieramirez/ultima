import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Toast } from '@ultima/ui';

const styles = stylex.create({
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-3'],
  },
  text: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    gap: space['--ult-space-2'],
    minWidth: 0,
  },
});

export default function Stacked() {
  return (
    <Toast.Provider>
      <Queue />
      <Toast.Portal>
        <Toast.Viewport>
          <Stack />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function Queue() {
  const toasts = Toast.useToastManager();

  return (
    <div {...stylex.props(styles.actions)}>
      <Button
        onClick={() =>
          toasts.add({ title: 'Report exported', description: 'Saved to your downloads.', type: 'success' })
        }
      >
        Export report
      </Button>
      <Button
        variant="outline"
        onClick={() => toasts.add({ title: 'Draft discarded', description: 'The changes are gone.' })}
      >
        Discard draft
      </Button>
      <Button
        variant="outline"
        tone="danger"
        onClick={() =>
          toasts.add({
            title: 'Upload failed',
            description: 'The connection dropped.',
            type: 'error',
            priority: 'high',
          })
        }
      >
        Fail an upload
      </Button>
    </div>
  );
}

function Stack() {
  const { toasts } = Toast.useToastManager();

  return toasts.map((toast) => (
    <Toast.Root key={toast.id} toast={toast}>
      <Toast.Content>
        <div {...stylex.props(styles.text)}>
          <Toast.Title />
          <Toast.Description />
        </div>
        <Toast.Action render={<Button variant="ghost" size="sm" />}>Undo</Toast.Action>
        <Toast.Close render={<Button variant="ghost" size="sm" />}>Dismiss</Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}
