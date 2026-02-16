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
  /** Path relative to `basename` */
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

const basenameAtom: VAtom<string> = v("");

function stripBasename(pathname: string, basename: string): string {
  if (!basename) return pathname;
  const b = basename.endsWith("/") ? basename.slice(0, -1) : basename;
  if (b && pathname.startsWith(b)) {
    const rest = pathname.slice(b.length);
    return rest.startsWith("/") ? rest : "/" + rest;
  }
  return pathname;
}

function withBasename(pathname: string, basename: string): string {
  if (!basename) return pathname;
  const b = basename.endsWith("/") ? basename.slice(0, -1) : basename;
  if (!b) return pathname;
  if (pathname === "/") return b + "/";
  return b + (pathname.startsWith("/") ? pathname : "/" + pathname);
}

const getWindowLocation = (basename = ""): LocationState => {
  if (typeof window === "undefined") {
    return { path: "/", query: "", hash: "" };
  }
  return {
    path: stripBasename(window.location.pathname, basename),
    query: window.location.search,
    hash: window.location.hash,
  };
};

export const location: VAtom<LocationState> = v(getWindowLocation());

function resolveUrl(to: string): URL {
  let base =
    typeof window !== "undefined" && window.location
      ? window.location.href
      : "http://localhost/";
  if (base === "about:srcdoc") base = "http://localhost/";
  return new URL(to, base);
}

export function prefetch(to: string): Promise<any> {
  const url = resolveUrl(to);
  const base = get(basenameAtom);
  const path = stripBasename(url.pathname, base);
  const query = url.search;

  for (const entry of routeRegistry.values()) {
    const params = matchPath(entry.pattern, path);
    if (params === null) continue;

    const loc: LocationState = { path, query, hash: url.hash };
    const ctx: LoaderCtx = { params, search: url.searchParams, location: loc };
    const key = makeRouteCacheKey(entry.routeId, ctx);

    return primeLoaderCache(key, () => Promise.resolve(entry.loader(ctx))).catch(
      // Prefetch should never crash the app
      () => undefined,
    );
  }

  return Promise.resolve(undefined);
}

export function navigate(to: string) {
  if (typeof window !== "undefined") {
    const url = resolveUrl(to);
    const base = get(basenameAtom);

    const relPath = stripBasename(url.pathname, base);
    const next = withBasename(relPath, base) + url.search + url.hash;

    const nextLoc: LocationState = {
      path: relPath,
      query: url.search,
      hash: url.hash,
    };

    try {
      window.history.pushState(null, "", next);
    } catch (e) {
      // In srcdoc iframe or restricted environments, pushState may fail.
      // We proceed with updating the app location state anyway (memory routing).
      console.warn("Router: history.pushState blocked", e);
    }
    set(location, nextLoc);
  }
}

export function Router(props: { children: any; basename?: string }) {
  // Keep basename in an atom so navigate/prefetch can read it.
  if (typeof props.basename === "string") {
    set(basenameAtom, props.basename);
    // Update location to ensure it reflects the new basename
    set(location, getWindowLocation(props.basename));
  }

  const update = () => set(location, getWindowLocation(get(basenameAtom)));
  if (typeof window !== "undefined") {
    window.addEventListener("popstate", update);
    onCleanup(() => window.removeEventListener("popstate", update));
  }
  return props.children;
}

/**
 * Exclusive routing: renders the first matching <Route> among its children.
 * Place a `path="*"` route last for 404.
 */
export function Routes(props: { children: any }) {
  return () => {
    const base = useContext(BasePathContext);
    const loc = get(location);

    const children = Array.isArray(props.children)
      ? props.children
      : [props.children];

    for (const child of children) {
      if (!child || typeof child !== "object") continue;
      if ((child as any)._brand !== "component") continue;
      const c: any = child;
      const p = c.props;
      if (!p || typeof p.path !== "string") continue;

      const fullPattern = p.path.startsWith("/")
        ? p.path
        : joinPaths(base || "", p.path);

      if (matchPath(fullPattern, loc.path) !== null) {
        return child;
      }
    }

    return null;
  };
}

// --- Contexts / hooks ---

const ParamsContext = createContext<Record<string, string>>({});
const BasePathContext = createContext<string>("");
const SearchContext = createContext<URLSearchParams>(new URLSearchParams());
const LoaderDataContext = createContext<any>(undefined);
const OutletContext = createContext<any>(null);

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

export function Outlet() {
  return useContext(OutletContext);
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

type RouteRegistryEntry = {
  routeId: string;
  pattern: string;
  loader: RouteLoader<any>;
};

// Best-effort registry for prefetch() (populated as routes mount)
const routeRegistry = new Map<string, RouteRegistryEntry>();

// A small global tick to trigger route re-evaluation after invalidation.
// (Deleting from the cache alone does not notify the reactive graph.)
const invalidateTick = v(0);

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
  set(invalidateTick, (c) => c + 1);
}

// Back-compat: invalidate(prefix) == invalidateRoute(prefix)
export const invalidate = invalidateRoute;

const RouteKeyContext = createContext<string | null>(null);

export function invalidateCurrent(): void {
  const key = useContext(RouteKeyContext);
  if (!key) return;
  loaderCache.delete(key);
  set(invalidateTick, (c) => c + 1);
}

function primeLoaderCache<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = loaderCache.get(key);
  if (existing) {
    if (existing.status === "fulfilled") return Promise.resolve(existing.value as T);
    if (existing.status === "rejected") return Promise.reject(existing.error);
    return existing.promise as Promise<T>;
  }

  const promise = Promise.resolve().then(load);
  loaderCache.set(key, { status: "pending", promise });

  promise.then(
    (value) => loaderCache.set(key, { status: "fulfilled", value }),
    (error) => loaderCache.set(key, { status: "rejected", error }),
  );

  return promise;
}

function readLoaderCache<T>(key: string, load: () => Promise<T>): T {
  const existing = loaderCache.get(key);
  if (existing) {
    if (existing.status === "fulfilled") return existing.value as T;
    if (existing.status === "rejected") throw existing.error;
    throw existing.promise;
  }

  const promise = primeLoaderCache(key, load);
  throw promise;
}

// --- Path matching ---

function joinPaths(base: string, child: string): string {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const c = child.startsWith("/") ? child : "/" + child;
  if (!b) return c;
  return b + c;
}

function matchPath(
  pattern: string,
  path: string,
): Record<string, string> | null {
  if (pattern === "*") return {};

  const isPrefix = pattern.endsWith("*");
  const normalized = isPrefix ? pattern.slice(0, -1) : pattern;

  const a = normalized.split("/").filter(Boolean);
  const b = path.split("/").filter(Boolean);

  if (!isPrefix && a.length !== b.length) return null;
  if (isPrefix && b.length < a.length) return null;

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

  // NOTE: Route must be reactive to both location changes and loader invalidations.
  // Returning a dynamic function makes the subtree refresh (with cleanup) when deps change.
  return () => {
    const base = useContext(BasePathContext);
    const fullPattern = props.path.startsWith("/")
      ? props.path
      : joinPaths(base || "", props.path);

    const loc = get(location);
    const matchedParams = matchPath(fullPattern, loc.path);
    if (matchedParams === null) return null;

    const parentParams = useContext(ParamsContext);
    const params = { ...(parentParams || {}), ...(matchedParams || {}) };
    const search = new URLSearchParams(loc.query || "");
    const ctx: LoaderCtx = { params, search, location: loc };

    // Nested routes can use relative paths. We expose the current matched base.
    const nextBase = fullPattern.endsWith("*")
      ? fullPattern.slice(0, -1)
      : fullPattern;

    let data: any = undefined;
    let routeCacheKey: string | null = null;
    if (props.loader) {
      // subscribe to invalidations
      get(invalidateTick);

      routeCacheKey = makeRouteCacheKey(routeId, ctx);

      // Register for prefetch() (best-effort)
      routeRegistry.set(`${routeId}|${fullPattern}`, {
        routeId,
        pattern: fullPattern,
        loader: props.loader,
      });

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
            // IMPORTANT: do not overwrite `run` with a stale/undefined value.
            // Always preserve the existing function by using an updater.
            set(actionState, (s) => ({ ...s, pending: true, error: undefined }));
            try {
              const out = await props.action!(ctx, input);
              set(actionState, (s) => ({ ...s, pending: false, data: out }));
              if (invalidateOnAction && routeCacheKey) {
                loaderCache.delete(routeCacheKey);
                set(invalidateTick, (c) => c + 1);
              }
              return out;
            } catch (e) {
              set(actionState, (s) => ({ ...s, pending: false, error: e }));
              throw e;
            }
          },
        }));
      }

      const actionApi: ActionApi<any, any> = {
        run: (input: any) => {
          const st = get(actionState);
          if (!st.run) {
            return Promise.reject(new Error("No action registered for this route"));
          }
          return st.run(input);
        },
        pending: () => get(actionState).pending,
        error: () => get(actionState).error,
        data: () => get(actionState).data,
      };

      const childrenArr = Array.isArray(props.children)
        ? props.children
        : [props.children];

      const renderChild = childrenArr[0];
      const nestedCandidates = childrenArr.slice(1);

      const child =
        typeof renderChild === "function"
          ? () => renderChild(data, { ...ctx, action: actionApi })
          : renderChild;

      // Implicit nested routing: if nested <Route> children exist, pick the first match
      // under this route's base and expose it via <Outlet />.
      let outletNode: any = null;
      if (nestedCandidates.length > 0) {
        for (const n of nestedCandidates) {
          if (!n || typeof n !== "object") continue;
          if ((n as any)._brand !== "component") continue;
          const c: any = n;
          const p = c.props;
          if (!p || typeof p.path !== "string") continue;

          const fullPattern = p.path.startsWith("/")
            ? p.path
            : joinPaths(nextBase || "", p.path);

          if (matchPath(fullPattern, loc.path) !== null) {
            outletNode = n;
            break;
          }
        }
      }

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
                        children: {
                          // @ts-ignore
                          _brand: "component",
                          type: BasePathContext.Provider,
                          props: {
                            value: nextBase,
                            children: {
                              // @ts-ignore
                              _brand: "component",
                              type: OutletContext.Provider,
                              props: {
                                value: outletNode,
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
            },
          },
        },
      },
    });
  };
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

  const onMouseEnter = () => {
    // Best-effort prefetch
    prefetch(props.href);
  };

  return h("a", { ...props, onClick, onMouseEnter }, props.children);
}
