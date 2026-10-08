'use client';

import { Button } from '@ultima/ui/button';
import { useThemeMode } from '@ultima/ui/theme-mode';

export default function Mode() {
  const { mode, resolved, setMode } = useThemeMode();
  return <Button onClick={() => setMode(mode === 'dark' ? 'light' : mode === 'light' ? 'system' : 'dark')}>Mode: {mode} ({resolved ?? 'loading'})</Button>;
}
