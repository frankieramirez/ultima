// A consumer program the public API must reject. Each `expect` names the TypeScript diagnostic the
// line after it receives; the compile test asserts exactly these and no others.
import { Button } from '@ultima/ui/button';
import { Card } from '@ultima/ui/card';
import { Dialog } from '@ultima/ui/dialog';

export function Invalid() {
  return (
    <>
      {/* expect TS2322: className is no styled wrapper's prop */}
      <Button className="escape" />
      {/* expect TS2322: a native CSSProperties object is not the StyleX slot */}
      <Button style={{ color: 'red' }} />
      {/* expect TS2322: a styled Base UI part has no className either */}
      <Dialog.Popup className="escape" />
      {/* expect TS2322: a plain root has no className */}
      <Card.Root className="escape" />
      {/* expect TS2322: a plain slot renders a fixed element and takes no render */}
      <Card.Header render={<section />} />
      {/* expect TS2322: a plain slot's style is the StyleX slot too */}
      <Card.Body style={{ padding: 0 }} />
    </>
  );
}
