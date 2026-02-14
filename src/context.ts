import { getContext, runWithContext, getGlobalContext } from "./core";
import { resolve } from "./jsx-runtime";

export interface Context<T> {
  id: symbol;
  defaultValue: T;
  Provider: (props: { value: T; children: any }) => any;
}

export function createContext<T>(defaultValue: T, key?: symbol): Context<T> {
  const id = key || Symbol("context");

  const Provider = (props: { value: T; children: any }) => {
    // Create new context inheriting from current
    const current = getGlobalContext();
    // Use Object.create for prototype chain lookup
    const newContext = Object.create(current || null);
    newContext[id] = props.value;

    return runWithContext(newContext, () => {
      // Resolve children while context is active
      // This allows components passed as children to execute useContext inside their body
      return resolve(props.children);
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
