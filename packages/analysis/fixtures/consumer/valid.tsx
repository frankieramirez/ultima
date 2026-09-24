// A consumer program the public API must accept: the StyleX slot on every part kind, render and ref
// where the part category keeps them, and an unchanged primitive part with the primitive's own props.
import * as stylex from '@stylexjs/stylex';
import { Button } from '@ultima/ui/button';
import { Calendar } from '@ultima/ui/calendar';
import { Card } from '@ultima/ui/card';
import { Dialog } from '@ultima/ui/dialog';
import { useSidebar } from '@ultima/ui/sidebar';
import { useRef } from 'react';

const styles = stylex.create({ wide: { width: '100%' } });

export function Valid() {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={ref} style={styles.wide} render={<a href="#top" />} />
      <Button style={[styles.wide, false]} />
      <Card.Root style={styles.wide} render={<section />}>
        <Card.Header style={styles.wide} />
      </Card.Root>
      <Calendar.Root style={styles.wide}>
        <Calendar.Label style={styles.wide} />
      </Calendar.Root>
      <Dialog.Root>
        <Dialog.Close className="primitive-owned" render={<Button />} />
        <Dialog.Popup style={styles.wide} />
      </Dialog.Root>
    </>
  );
}

export function SidebarState() {
  const { open } = useSidebar();
  return open;
}
