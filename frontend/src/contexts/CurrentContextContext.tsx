import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ContextInfo } from '../types/user.types';

const STORAGE_KEY = 'gds_current_context';

interface CurrentContextValue {
  /** Contexto atualmente selecionado. null apenas enquanto está carregando. */
  currentContext: ContextInfo | null;
  setCurrentContext: (ctx: ContextInfo) => void;
  /** Lista de contextos disponíveis para troca */
  availableContexts: ContextInfo[];
}

const CurrentContextContext = createContext<CurrentContextValue | undefined>(undefined);

interface CurrentContextProviderProps {
  children: ReactNode;
  availableContexts: ContextInfo[];
}

export function CurrentContextProvider({
  children,
  availableContexts,
}: CurrentContextProviderProps) {
  const [currentContext, setCurrentContextState] = useState<ContextInfo | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as ContextInfo;
    } catch {
      // ignore parse errors
    }
    return null;
  });

  useEffect(() => {
    if (availableContexts.length === 0) return;

    if (currentContext) {
      // Revalida o contexto armazenado: pode ter mudado o nome
      const match = availableContexts.find((c) => c.id === currentContext.id);
      if (match) {
        // Atualiza o nome caso tenha mudado, sem trocar o contexto
        if (match.name !== currentContext.name) {
          setCurrentContextState(match);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(match));
        }
        return;
      }
    }

    // Nenhum contexto armazenado ou inválido: usa o primeiro disponível
    const first = availableContexts[0];
    setCurrentContextState(first);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(first));
  }, [availableContexts]);

  const setCurrentContext = (ctx: ContextInfo) => {
    setCurrentContextState(ctx);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  };

  return (
    <CurrentContextContext.Provider value={{ currentContext, setCurrentContext, availableContexts }}>
      {children}
    </CurrentContextContext.Provider>
  );
}

export function useCurrentContext() {
  const ctx = useContext(CurrentContextContext);
  if (!ctx) {
    throw new Error('useCurrentContext must be used within CurrentContextProvider');
  }
  return ctx;
}
