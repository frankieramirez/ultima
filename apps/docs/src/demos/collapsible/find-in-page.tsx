import { Button, Collapsible } from '@ultima/ui';

export default function FindInPageCollapsible() {
  return (
    <Collapsible.Root>
      <Collapsible.Trigger render={<Button variant="ghost" />}>Troubleshooting</Collapsible.Trigger>
      <Collapsible.Panel hiddenUntilFound>
        <p>If the tokens stylesheet 404s, the registry build has not run. Run pnpm registry:build.</p>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
