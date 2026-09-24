// A native control, or a role standing in for one, is advisory where an installed item provides it.
import { createElement } from 'react';

import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';

function Plain({ render }: { render: React.ReactElement }) {
  return render;
}

export function Controls({ kind }: { kind: string }) {
  return (
    <form>
      <button type="submit">Save</button>
      <div role="button" tabIndex={0}>Fake</div>
      <Button render={<a href="/docs" />}>Docs</Button>
      <Tabs.Tab value="a" render={<button type="button" />} />
      <Plain render={<button type="button" />} />
      <input name="email" type="email" />
      <input name="agree" type="checkbox" />
      <input name="file" type="file" />
      <input name="dynamic" type={kind} />
      <div role="region">Not a widget</div>
      {createElement('textarea')}
    </form>
  );
}
