import {
  v,
  get,
  set,
  onCleanup,
  type VAtom,
  type Getter,
} from "./core";
import { Show } from "./flow";
import { h, resolve } from "./jsx-runtime";
import { createContext, useContext } from "./context";

export interface LocationState {
  path: string;
  query: string;
  hash: string;
}

export interface LoaderCtx {
  params: Record<string, string>;
  search: URLSearchParams;
  location: LocationState;
}

export type RouteLoader<T> = (ctx: LoaderCtx) => T | Promise<T>;
export type RouteAction<Input = any, Output = any> = (
  ctx: LoaderCtx,
  input: Input,
) => Output | Promise<Output>;

// --- Location ---

const getWindowLocation = (): LocationState => {
  if (typeof window === "undefined") {
    return { path: "/", query: "", hash: "" };
  }
  return {
    path: window.location.pathname,
    query: window.location.search,
    hash: window.location.hash,
  };
};

export const location: VAtom<LocationState> = v(getWindowLocation());

export function navigate(to: string) {
  if (typeof window !== "undefined") {
    window.history.pushState(null, "", to);
    set(location, getWindowLocation());
  }
}

export function Router(props: { children: any }) {
  const update = () => set(location, getWindowLocation());
  if (typeof window !== "undefined") {
    window.addEventListener("popstate", update);
    onCleanup(() => window.removeEventListener("popstate", update));
  }
  return props.children;
}

// --- Contexts / hooks ---

const ParamsContext = createContext<Record<string, string>>({});
const SearchContext = createContext<URLSearchParams>(new URLSearchParams());
const LoaderDataContext = createContext<any>(undefined);

type ActionState = {
  pending: boolean;
  error: any;
  data: any;
  run?: (input: any) => Promise<any>;
};
const ActionContext = createContext<VAtom<ActionState> | null>(null);

export function useParams(): Record<string, string> {
  return useContext(ParamsContext);
}

export function useSearch(): URLSearchParams {
  return useContext(SearchContext);
}

export function useLoaderData<T = any>(): T {
  return useContext(LoaderDataContext) as T;
}

export type ActionApi<TInput = any, TOutput = any> = {
  run: (input: TInput) => Promise<TOutput>;
  pending: () => boolean;
  error: () => any;
  data: () => TOutput | undefined;
};

export function useAction<TInput = any, TOutput = any>(): ActionApi<TInput, TOutput> {
  const stAtom = useContext(ActionContext);
  if (!stAtom) {
    return {
      run: async () => {
        throw new Error("useAction() used outside of a Route with action");
      },
      pending: () => false,
      error: () => undefined,
      data: () => undefined,
    };
  }

  const run = (input: TInput) => {
    const st = get(stAtom);
    if (!st.run) {
      return Promise.reject(new Error("No action registered for this route"));
    }
    return st.run(input) as Promise<TOutput>;
  };

  return {
    run,
    pending: () => get(stAtom).pending,
    error: () => get(stAtom).error,
    data: () => get(stAtom).data as TOutput | undefined,
  };
}

// --- Loader cache (SPA) ---

type CacheEntry =
  | { status: "pending"; promise: Promise<any> }
  | { status: "fulfilled"; value: any }
  | { status: "rejected"; error: any };

const loaderCache = new Map<string, CacheEntry>();

function stableJson(obj: any): string {
  if (!obj || typeof obj !== "object") return JSON.stringify(obj);
  const keys = Object.keys(obj).sort();
  const out: any = {};
  for (const k of keys) out[k] = (obj as any)[k];
  return JSON.stringify(out);
}

function makeRouteCacheKey(routeId: string, ctx: LoaderCtx): string {
  // Path matters for params; query matters for search-driven loaders.
  // Params are included explicitly to avoid ambiguity.
  return `${routeId}|path=${ctx.location.path}|query=${ctx.location.query}|params=${stableJson(ctx.params)}`;
}

export function invalidateRoute(routeIdPrefix: string): void {
  for (const k of loaderCache.keys()) {
    if (k.startsWith(routeIdPrefix + "|")) {
      loaderCache.delete(k);
    }
  }
}

// Back-compat: invalidate(prefix) == invalidateRoute(prefix)
export const invalidate = invalidateRoute;

const RouteKeyContext = createContext<string | null>(null);

export function invalidateCurrent(): void {
  const key = useContext(RouteKeyContext);
  if (!key) return;
  loaderCache.delete(key);
}

function readLoaderCache<T>(key: string, load: () => Promise<T>): T {
  const existing = loaderCache.get(key);
  if (existing) {
    if (existing.status === "fulfilled") return existing.value as T;
    if (existing.status === "rejected") throw existing.error;
    throw existing.promise;
  }

  const promise = Promise.resolve().then(load);
  loaderCache.set(key, { status: "pending", promise });

  promise.then(
    (value) => loaderCache.set(key, { status: "fulfilled", value }),
    (error) => loaderCache.set(key, { status: "rejected", error }),
  );

  throw promise;
}

// --- Path matching ---

function matchPath(
  pattern: string,
  path: string,
): Record<string, string> | null {
  if (pattern === "*") return {};

  // Prefix wildcard: "/foo/*"
  if (pattern.endsWith("*")) {
    const base = pattern.slice(0, -1);
    if (path.startsWith(base)) return {};
    return null;
  }

  const a = pattern.split("/").filter(Boolean);
  const b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    const seg = a[i];
    const cur = b[i];
    if (seg.startsWith(":")) {
      params[seg.slice(1)] = decodeURIComponent(cur);
      continue;
    }
    if (seg !== cur) return null;
  }
  return params;
}

// --- Route component ---

export function Route<T = any>(props: {
  id?: string;
  path: string;
  loader?: RouteLoader<T>;
  action?: RouteAction<any, any>;
  invalidateOnAction?: boolean;
  children:
    | any
    | ((data: T, ctx: LoaderCtx & { action: ActionApi<any, any> }) => any);
}) {
  const routeId = props.id || props.path;

  return Show({
    when: () => {
      const loc = get(location);
      return matchPath(props.path, loc.path) !== null;
    },
    children: () => {
      const loc = get(location);
      const params = matchPath(props.path, loc.path) || {};
      const search = new URLSearchParams(loc.query || "");
      const ctx: LoaderCtx = { params, search, location: loc };

      let data: any = undefined;
      let routeCacheKey: string | null = null;
      if (props.loader) {
        routeCacheKey = makeRouteCacheKey(routeId, ctx);
        data = readLoaderCache(routeCacheKey, () => Promise.resolve(props.loader!(ctx)));
      }

      const actionState = v<ActionState>({
        pending: false,
        error: undefined,
        data: undefined,
      });

      if (props.action) {
        const invalidateOnAction = props.invalidateOnAction ?? true;
        set(actionState, (prev) => ({
          ...prev,
          run: async (input: any) => {
            set(actionState, { pending: true, error: undefined, data: prev.data, run: prev.run });
            try {
              const out = await props.action!(ctx, input);
              set(actionState, (s) => ({ ...s, pending: false, data: out }));
              if (invalidateOnAction && routeCacheKey) {
                loaderCache.delete(routeCacheKey);
              }
              return out;
            } catch (e) {
              set(actionState, (s) => ({ ...s, pending: false, error: e }));
              throw e;
            }
          },
        }));
      }

      const actionApi = useAction();

      const child =
        typeof props.children === "function"
          ? props.children(data, { ...ctx, action: actionApi })
          : props.children;

      // Provide contexts to children
      return resolve({
        // @ts-ignore
        _brand: "component",
        type: ParamsContext.Provider,
        props: {
          value: params,
          children: {
            // @ts-ignore
            _brand: "component",
            type: SearchContext.Provider,
            props: {
              value: search,
              children: {
                // @ts-ignore
                _brand: "component",
                type: LoaderDataContext.Provider,
                props: {
                  value: data,
                  children: {
                    // @ts-ignore
                    _brand: "component",
                    type: ActionContext.Provider,
                    props: {
                      value: actionState,
                      children: {
                        // @ts-ignore
                        _brand: "component",
                        type: RouteKeyContext.Provider,
                        props: {
                          value: routeCacheKey,
                          children: child,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    },
  });
}

export function A(props: {
  href: string;
  class?: string;
  className?: string;
  children?: any;
}) {
  const onClick = (e: MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0)
      return;
    e.preventDefault();
    navigate(props.href);
  };

  return h("a", { ...props, onClick }, props.children);
}
