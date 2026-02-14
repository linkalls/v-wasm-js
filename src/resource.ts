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

export interface ResourceOptions<T> {
  initialValue?: T;
  retries?: number;
  retryDelayMs?: number | ((attempt: number, error: unknown) => number);
  onError?: (error: unknown, attempt: number) => void;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function normalizeRetryDelay<T>(
  options: ResourceOptions<T>,
  attempt: number,
  error: unknown,
): number {
  if (typeof options.retryDelayMs === "function") {
    return Math.max(0, options.retryDelayMs(attempt, error));
  }
  if (typeof options.retryDelayMs === "number") {
    return Math.max(0, options.retryDelayMs);
  }
  // default lightweight backoff: 150ms, 300ms, 450ms...
  return 150 * attempt;
}

export function createResource<T>(
  fetcher: ResourceFetcher<void, T>,
  options?: ResourceOptions<T>
): Resource<T>;
export function createResource<T, S>(
  source: S | (() => S),
  fetcher: ResourceFetcher<S, T>,
  options?: ResourceOptions<T>
): Resource<T>;
export function createResource<T, S = void>(
  source: S | (() => S) | ResourceFetcher<void, T>,
  fetcherOrOptions?: ResourceFetcher<S, T> | ResourceOptions<T>,
  maybeOptions?: ResourceOptions<T>
): Resource<T> {
  let srcFn: () => S;
  let fn: ResourceFetcher<S, T>;
  let options: ResourceOptions<T> = maybeOptions || {};

  if (arguments.length === 1) {
    fn = source as unknown as ResourceFetcher<S, T>;
    srcFn = () => undefined as unknown as S;
  } else if (arguments.length === 2 && typeof fetcherOrOptions !== "function") {
    fn = source as unknown as ResourceFetcher<S, T>;
    srcFn = () => undefined as unknown as S;
    options = (fetcherOrOptions || {}) as ResourceOptions<T>;
  } else {
    fn = fetcherOrOptions as ResourceFetcher<S, T>;
    if (typeof source === "function") {
      srcFn = source as () => S;
    } else {
      srcFn = () => source as S;
    }
  }

  const retries = Math.max(0, options.retries ?? 0);

  const state = v<ResourceState<T>>({
    value: options.initialValue,
    loading: true,
    error: undefined
  });

  let abortController: AbortController | null = null;
  let currentPromise: Promise<T> | null = null;

  const load = async (currentSource: S) => {
    if (abortController) abortController.abort();
    abortController = new AbortController();
    const signal = abortController.signal;

    set(state, (prev) => ({ ...prev, loading: true, error: undefined }));

    const execute = async (): Promise<T> => {
      let attempt = 0;
      while (true) {
        attempt += 1;
        try {
          return await fn(currentSource, { signal });
        } catch (error) {
          if (signal.aborted) throw error;
          options.onError?.(error, attempt);

          if (attempt > retries) {
            throw error;
          }

          const waitMs = normalizeRetryDelay(options, attempt, error);
          if (waitMs > 0) {
            await delay(waitMs, signal);
          }
        }
      }
    };

    try {
      const p = execute();
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
