import { Button } from '@ultima/ui';
import { Placeholder } from './placeholder';

export function Home() {
  return (
    <>
      <Placeholder title="Ultima" ticket="ULT-41" />
      <Button render={<a href="/install" />} nativeButton={false}>Install Ultima</Button>
    </>
  );
}
