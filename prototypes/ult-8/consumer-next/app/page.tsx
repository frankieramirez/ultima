// PROTOTYPE (ULT-8). Renders the registry-installed Button in both themes.
import * as stylex from '@stylexjs/stylex';
import { Button } from '@/components/ui/button';
import { darkTheme, lightTheme } from '@/lib/themes';
import { color, font, radius, space } from '@/lib/tokens.stylex';

const styles = stylex.create({
  page: { display: 'grid', gap: space.xl, padding: space.xl, fontFamily: font.sans, minHeight: '100vh', margin: 0 },
  panel: {
    backgroundColor: color.surface,
    color: color.text,
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.border,
    display: 'flex',
    gap: space.md,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});

function Panel({ theme, label }: { theme: stylex.Theme<typeof color>; label: string }) {
  return (
    <section {...stylex.props(theme, styles.panel)} data-testid={`panel-${label}`}>
      <span>{label}</span>
      <Button>Solid</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost" size="sm">Ghost</Button>
      <Button size="lg" disabled>Disabled</Button>
    </section>
  );
}

export default function Page() {
  return (
    <main {...stylex.props(styles.page)}>
      <h1>ULT-8 consumer: Next.js App Router</h1>
      <Panel theme={darkTheme} label="dark" />
      <Panel theme={lightTheme} label="light" />
    </main>
  );
}
