import { Card, Code } from '@ultima/ui';

export default function InCard() {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Install Button</Card.Title>
        <Card.Description>Copy source into a registry-first project.</Card.Description>
      </Card.Header>
      <Card.Body>
        <Code variant="block">npx shadcn@4.21.4 add @ultima/button</Code>
      </Card.Body>
    </Card.Root>
  );
}
