import { Tabs } from '@ultima/ui';

export default function Vertical() {
  return (
    <Tabs.Root orientation="vertical" defaultValue="account">
      <Tabs.List aria-label="Account settings">
        <Tabs.Tab value="account">Account</Tabs.Tab>
        <Tabs.Tab value="security">Security</Tabs.Tab>
        <Tabs.Tab value="billing">Billing</Tabs.Tab>
        <Tabs.Indicator />
      </Tabs.List>
      <Tabs.Panel value="account">Update your profile and contact details.</Tabs.Panel>
      <Tabs.Panel value="security">Manage passwords and sign-in methods.</Tabs.Panel>
      <Tabs.Panel value="billing">Review plans and invoices.</Tabs.Panel>
    </Tabs.Root>
  );
}
