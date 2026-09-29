import { createContext, type RefObject } from 'react';

export const StudioPortalContext = createContext<RefObject<HTMLElement | null> | undefined>(undefined);
export const StudioInspectionContext = createContext<(target: HTMLElement) => void>(() => {});
