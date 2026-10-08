'use client';

import { createElement, useCallback, useSyncExternalStore } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';

type Snapshot = { mode: ThemeMode; resolved: 'dark' | 'light' | null };
const STORAGE_KEY = 'ultima-theme-mode';
const PREFERENCE = '(prefers-color-scheme: light)';
const SERVER: Snapshot = { mode: 'system', resolved: null };
const listeners = new Set<() => void>();
let snapshot = SERVER;

function explicitMode(value: string | null): ThemeMode {
  return value === 'dark' || value === 'light' ? value : 'system';
}

function applyMode(mode: ThemeMode): void {
  if (mode === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', mode);
  for (const listener of listeners) listener();
}

export function themeModeScript(storageKey = STORAGE_KEY): string {
  const key = JSON.stringify(storageKey).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `(()=>{let m;try{m=localStorage.getItem(${key})}catch{}const r=document.documentElement;if(m==='dark'||m==='light')r.setAttribute('data-theme',m);else r.removeAttribute('data-theme')})()`;
}

export type ThemeModeScriptProps = { storageKey?: string; nonce?: string };

export function ThemeModeScript({ storageKey, nonce }: ThemeModeScriptProps = {}) {
  return createElement('script', { nonce, dangerouslySetInnerHTML: { __html: themeModeScript(storageKey) } });
}

export function setThemeMode(mode: ThemeMode, storageKey = STORAGE_KEY): void {
  applyMode(mode);
  try { localStorage.setItem(storageKey, mode); } catch {}
}

function getSnapshot(): Snapshot {
  const mode = explicitMode(document.documentElement.getAttribute('data-theme'));
  const resolved = mode === 'system' ? (matchMedia(PREFERENCE).matches ? 'light' : 'dark') : mode;
  if (snapshot.mode !== mode || snapshot.resolved !== resolved) snapshot = { mode, resolved };
  return snapshot;
}

function subscribe(listener: () => void, storageKey: string): () => void {
  listeners.add(listener);
  const preference = matchMedia(PREFERENCE);
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const storage = (event: StorageEvent) => {
    if (event.key !== storageKey && event.key !== null) return;
    try { if (event.storageArea && event.storageArea !== localStorage) return; } catch { return; }
    applyMode(explicitMode(event.newValue));
  };
  preference.addEventListener('change', listener);
  window.addEventListener('storage', storage);
  return () => {
    listeners.delete(listener);
    observer.disconnect();
    preference.removeEventListener('change', listener);
    window.removeEventListener('storage', storage);
  };
}

export function useThemeMode(storageKey = STORAGE_KEY) {
  const listen = useCallback((listener: () => void) => subscribe(listener, storageKey), [storageKey]);
  const state = useSyncExternalStore(listen, getSnapshot, () => SERVER);
  const setMode = useCallback((mode: ThemeMode) => setThemeMode(mode, storageKey), [storageKey]);
  return { ...state, setMode };
}
