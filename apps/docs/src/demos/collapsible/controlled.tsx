import { useState } from 'react';
import { Button, Collapsible } from '@ultima/ui';

export default function ControlledCollapsible() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible.Root onOpenChange={setOpen} open={open}>
      <Collapsible.Trigger render={<Button variant="ghost" />}>
        {open ? 'Hide the query plan' : 'Show the query plan'}
      </Collapsible.Trigger>
      <Collapsible.Panel>
        <p>Seq scan on events, 1.2M rows, 340ms. No index on occurred_at.</p>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
