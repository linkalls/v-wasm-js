import { getContext, runWithContext, getGlobalContext } from "./core";

export interface Context<T> {
  id: symbol;
  defaultValue: T;
  Provider: (props: { value: T; children: any }) => any;
}

export function createContext<T>(defaultValue: T): Context<T> {
  const id = Symbol("context");

  const Provider = (props: { value: T; children: any }) => {
    // Create new context inheriting from current
    const current = getGlobalContext();
    // Use Object.create for prototype chain lookup
    const newContext = Object.create(current || null);
    newContext[id] = props.value;

    return runWithContext(newContext, () => {
      const children = props.children;
      // Resolve children if function
      return typeof children === "function" ? children() : children;
    });
  };

  return { id, defaultValue, Provider };
}

export function useContext<T>(context: Context<T>): T {
  const value = getContext(context.id);
  if (value === undefined) {
    return context.defaultValue;
  }
  return value as T;
}
