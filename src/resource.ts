import { v, get, set, createEffect, onCleanup, type VAtom } from "./core";

export interface ResourceState<T> {
  value?: T;
  loading: boolean;
  error?: any;
}

export interface Resource<T> {
  (): T | undefined;
  loading: () => boolean;
  error: () => any;
  refetch: () => void;
  mutate: (val: T | undefined) => void;
  state: VAtom<ResourceState<T>>;
}

export type ResourceFetcher<S, T> = (
  source: S,
  info: { signal: AbortSignal }
) => Promise<T>;

export function createResource<T, S = void>(
  source: S | (() => S) | ResourceFetcher<void, T>,
  fetcher?: ResourceFetcher<S, T>
): Resource<T> {
  let srcFn: () => S;
  let fn: ResourceFetcher<S, T>;

  if (arguments.length === 1 || fetcher === undefined) {
    fn = source as unknown as ResourceFetcher<S, T>;
    srcFn = () => undefined as unknown as S;
  } else {
    fn = fetcher;
    if (typeof source === "function") {
      srcFn = source as () => S;
    } else {
      srcFn = () => source as S;
    }
  }

  const state = v<ResourceState<T>>({
    value: undefined,
    loading: true, // Start loading immediately
    error: undefined
  });

  let abortController: AbortController | null = null;
  let currentPromise: Promise<T> | null = null;

  const load = async (currentSource: S) => {
    if (abortController) abortController.abort();
    abortController = new AbortController();
    const signal = abortController.signal;

    set(state, (prev) => ({ ...prev, loading: true }));

    try {
      const p = fn(currentSource, { signal });
      currentPromise = p;
      const result = await p;

      if (signal.aborted) return;

      set(state, {
        value: result,
        loading: false,
        error: undefined
      });
    } catch (err: any) {
      if (signal.aborted) return;
      set(state, (prev) => ({
        ...prev,
        loading: false,
        error: err
      }));
    }
  };

  createEffect(() => {
    const s = srcFn();
    load(s);
  });

  onCleanup(() => {
    if (abortController) abortController.abort();
  });

  const read = () => {
    const s = get(state);
    if (s.error) throw s.error;
    if (s.loading && currentPromise) {
      throw currentPromise;
    }
    return s.value;
  };

  read.loading = () => get(state).loading;
  read.error = () => get(state).error;
  read.refetch = () => load(srcFn());
  read.mutate = (val: T | undefined) =>
    set(state, { value: val, loading: false, error: undefined });
  read.state = state;

  return read as Resource<T>;
}
