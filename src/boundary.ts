import { v, get, set, type VAtom } from './core';
import { createContext } from './context';
import { resolve, type VNode } from './jsx-runtime';

// Define context symbols
export const SUSPENSE_CONTEXT_SYMBOL = Symbol.for("vitrio.suspense");
export const ERROR_BOUNDARY_CONTEXT_SYMBOL = Symbol.for("vitrio.error");

// --- Suspense ---

export interface SuspenseContextValue {
  increment: () => void;
  decrement: () => void;
  state: VAtom<number>;
}

export const SuspenseContext = createContext<SuspenseContextValue | undefined>(undefined, SUSPENSE_CONTEXT_SYMBOL);

export function Suspense(props: { fallback?: any; children: any }): VNode {
  const pendingCount = v(0);

  const contextValue: SuspenseContextValue = {
    increment: () => set(pendingCount, (c) => c + 1),
    decrement: () => set(pendingCount, (c) => Math.max(0, c - 1)),
    state: pendingCount
  };

  const renderer = () => {
    // SSR: let promises bubble to renderToStringAsync.
    if (typeof document === 'undefined') {
      return resolve(props.children);
    }

    const count = get(pendingCount);
    if (count > 0) {
      return resolve(props.fallback);
    }

    try {
      return resolve(props.children);
    } catch (err: any) {
      if (err && typeof err.then === 'function') {
        // Handle initial render suspension
        contextValue.increment();
        err.then(contextValue.decrement, contextValue.decrement);
        return resolve(props.fallback);
      }
      throw err;
    }
  };

  return (
    // @ts-ignore
    {
      _brand: "component",
      type: SuspenseContext.Provider,
      props: {
        value: contextValue,
        children: renderer
      }
    }
  );
}

// --- ErrorBoundary ---

export interface ErrorBoundaryContextValue {
  handleError: (error: any) => void;
}

export const ErrorBoundaryContext = createContext<ErrorBoundaryContextValue | undefined>(undefined, ERROR_BOUNDARY_CONTEXT_SYMBOL);

export function ErrorBoundary(props: { fallback: (err: any) => any; children: any }): VNode {
  const error = v<any>(null);

  const contextValue: ErrorBoundaryContextValue = {
    handleError: (err: any) => set(error, err)
  };

  const renderer = () => {
    const err = get(error);
    if (err) {
      const fallbackFn = props.fallback;
      return resolve(typeof fallbackFn === 'function' ? fallbackFn(err) : fallbackFn);
    }

    try {
      return resolve(props.children);
    } catch (e: any) {
      // Handle initial render error
      set(error, e);
      const fallbackFn = props.fallback;
      return resolve(typeof fallbackFn === 'function' ? fallbackFn(e) : fallbackFn);
    }
  };

  return (
    // @ts-ignore
    {
      _brand: "component",
      type: ErrorBoundaryContext.Provider,
      props: {
        value: contextValue,
        children: renderer
      }
    }
  );
}
