import { v, get, set, type VAtom } from './core';

const nodeCache = new WeakMap<object, Map<string | symbol, VAtom<any>>>();
const proxyCache = new WeakMap<object, object>();

function getAtom(target: object, prop: string | symbol, value: any): VAtom<any> {
  let nodes = nodeCache.get(target);
  if (!nodes) {
    nodes = new Map();
    nodeCache.set(target, nodes);
  }
  let atom = nodes.get(prop);
  if (!atom) {
    atom = v(value);
    nodes.set(prop, atom);
  }
  return atom;
}

function wrap<T extends object>(obj: T): T {
  if (proxyCache.has(obj)) return proxyCache.get(obj) as T;

  const proxy = new Proxy(obj, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      // Skip tracking for symbols/iterators to avoid weird loops or framework internals
      if (typeof prop === 'symbol') return value;

      // Track dependency
      const atom = getAtom(target, prop, value);
      get(atom); // Subscribe

      if (value != null && typeof value === 'object') {
        return wrap(value);
      }
      return value;
    },
    set(target, prop, newValue, receiver) {
      const current = Reflect.get(target, prop, receiver);
      if (current !== newValue) {
        Reflect.set(target, prop, newValue, receiver);
        const atom = getAtom(target, prop, newValue);
        set(atom, newValue);
      }
      return true;
    },
    deleteProperty(target, prop) {
      const success = Reflect.deleteProperty(target, prop);
      if (success) {
         // Notify subscribers of this property that it's gone (undefined)
         const atom = getAtom(target, prop, undefined);
         set(atom, undefined);
      }
      return success;
    }
  });

  proxyCache.set(obj, proxy);
  return proxy;
}

export type SetStoreFunction<T> = (fn: (state: T) => void) => void;

export function createStore<T extends object>(initialState: T): [T, SetStoreFunction<T>] {
  const state = wrap(initialState);

  const setState = (fn: (state: T) => void) => {
    // Vitrio batches updates automatically via core microtask
    fn(state);
  };

  return [state, setState];
}
