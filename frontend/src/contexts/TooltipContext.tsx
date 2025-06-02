// src/contexts/TooltipContext.tsx
import React, { createContext, useContext, useState, ReactNode, MouseEvent } from 'react';
import type { Language } from '../components/LanguageMetaForm';

export interface TooltipState {
  word: string;
  coords: {
    x: number;
    yAbove: number;
    yBelow: number;
  };
  originalLang: Language;
  visible: boolean;
}

interface TooltipContextValue {
  tooltip: TooltipState | null;
  showTooltip: (word: string, e: MouseEvent<HTMLElement>, originalLang: Language) => void;
  hideTooltip: () => void;
}

const TooltipContext = createContext<TooltipContextValue | undefined>(undefined);

export function useTooltipContext(): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (!ctx) {
    throw new Error('useTooltipContext must be used within a TooltipProvider');
  }
  return ctx;
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const showTooltip = (word: string, e: MouseEvent<HTMLElement>, originalLang: Language) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const yAbove = rect.top - 8;
    const yBelow = rect.bottom + 8;
    setTooltip({
      word,
      coords: { x, yAbove, yBelow },
      originalLang,
      visible: true,
    });
  };

  const hideTooltip = () => {
    setTooltip(null);
  };

  return (
    <TooltipContext.Provider value={{ tooltip, showTooltip, hideTooltip }}>
      {children}
    </TooltipContext.Provider>
  );
}
