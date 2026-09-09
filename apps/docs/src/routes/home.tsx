import { Link } from '@tanstack/react-router';
import { Button } from '@ultima/ui';
import { Placeholder } from './placeholder';

export function Home() {
  return (
    <>
      <Placeholder title="Ultima" ticket="ULT-41" />
      <Button render={<Link to="/install" />} nativeButton={false}>Install Ultima</Button>
    </>
  );
}
