import { Button, Empty } from '@ultima/ui';

export default function NoReports() {
  return (
    <Empty.Root>
      <Empty.Title>No reports yet</Empty.Title>
      <Empty.Description>Run an audit and its findings will collect here.</Empty.Description>
      <Button>Run an audit</Button>
    </Empty.Root>
  );
}
