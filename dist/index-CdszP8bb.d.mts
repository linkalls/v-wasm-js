import { c as VNode } from "./jsx-runtime-BOuyqblg.mjs";

//#region src/core.d.ts
/**
 * V-Signal: Ultra-minimal reactive state management
 * Inspired by Jotai's simplicity, powered by V WASM
 */
type Getter = <T>(atom: VAtom<T>) => T;
type Subscriber = () => void;
interface VAtom<T> {
  _brand: "v-atom";
  init: T;
  read?: (get: Getter) => T;
  id?: number;
  _state?: VAtomState<T>;
}
interface VAtomState<T> {
  value: T;
  subscribers: Set<Subscriber>;
  deps: Set<VAtom<any>>;
  dependents: Set<VAtom<any>>;
}
interface VWasmExports {
  init_graph: () => number;
  create_node: (g: number) => number;
  add_dependency: (g: number, dependent: number, dependency: number) => void;
  propagate: (g: number, source: number) => number;
  get_update_buffer_ptr: (g: number) => number;
  _start: () => void;
  memory: WebAssembly.Memory;
}
type InitWasmPhase = "fetch" | "compile" | "setup";
interface InitWasmOptions {
  wasmPath?: string;
  module?: WebAssembly.Module | Promise<WebAssembly.Module>;
  onPerf?: (phase: InitWasmPhase, durationMs: number) => void;
}
declare function initWasm(options?: string | InitWasmOptions): Promise<void>;
declare function v<T>(initial: T): VAtom<T>;
declare namespace v {
  var from: typeof derive;
}
declare function derive<T>(read: (get: Getter) => T): VAtom<T>;
declare function get<T>(atom: VAtom<T>): T;
declare function set<T>(atom: VAtom<T>, value: T | ((prev: T) => T)): void;
declare function batch<T>(fn: () => T): T;
declare function startTransition<T>(fn: () => T): Promise<T>;
declare function subscribe<T>(atom: VAtom<T>, callback: Subscriber): () => void;
type UseAtomResult<T> = [T, (value: T | ((prev: T) => T)) => void];
declare function use<T>(atom: VAtom<T>): UseAtomResult<T>;
declare function useValue<T>(atom: VAtom<T>): T;
declare function useSet<T>(atom: VAtom<T>): (value: T | ((prev: T) => T)) => void;
declare function withRenderContext(component: () => void): void;
declare function untrack<T>(fn: () => T): T;
declare function onCleanup(fn: () => void): void;
declare function createEffect(fn: () => void | (() => void)): void;
declare function createRoot<T>(fn: (dispose: () => void) => T): T;
declare function wasm(): VWasmExports | null;
//#endregion
//#region src/store.d.ts
type SetStoreFunction<T> = (fn: (state: T) => void) => void;
declare function createStore<T extends object>(initialState: T): [T, SetStoreFunction<T>];
//#endregion
//#region src/context.d.ts
interface Context<T> {
  id: symbol;
  defaultValue: T;
  Provider: (props: {
    value: T;
    children: any;
  }) => any;
}
declare function createContext<T>(defaultValue: T, key?: symbol): Context<T>;
declare function useContext<T>(context: Context<T>): T;
//#endregion
//#region src/router.d.ts
interface LocationState {
  /** Path relative to `basename` */
  path: string;
  query: string;
  hash: string;
}
interface LoaderCtx {
  params: Record<string, string>;
  search: URLSearchParams;
  location: LocationState;
}
type RouteLoader<T> = (ctx: LoaderCtx) => T | Promise<T>;
type RouteAction<Input = any, Output = any> = (ctx: LoaderCtx, input: Input) => Output | Promise<Output>;
declare const location: VAtom<LocationState>;
declare function prefetch(to: string): Promise<any>;
declare function navigate(to: string): void;
declare function Router(props: {
  children: any;
  basename?: string;
  locationAtom?: VAtom<LocationState>;
  loaderCache?: Map<string, any>;
}): any;
/**
 * Exclusive routing: renders the first matching <Route> among its children.
 * Place a `path="*"` route last for 404.
 */
declare function Routes(props: {
  children: any;
}): () => any;
declare function Outlet(): any;
type ActionApi<TInput = any, TOutput = any> = {
  run: (input: TInput) => Promise<TOutput>;
  pending: () => boolean;
  error: () => any;
  data: () => TOutput | undefined;
};
type CacheEntry = {
  status: "pending";
  promise: Promise<any>;
} | {
  status: "fulfilled";
  value: any;
} | {
  status: "rejected";
  error: any;
};
declare function dehydrateLoaderCache(cache?: Map<string, CacheEntry>): Record<string, {
  status: "fulfilled";
  value: any;
} | {
  status: "rejected";
  error: any;
}>;
declare function hydrateLoaderCache(data: Record<string, any> | null | undefined, cache?: Map<string, CacheEntry>): void;
declare function stableJson(obj: any): string;
declare function makeRouteCacheKey(routeId: string, ctx: LoaderCtx): string;
declare function invalidateRoute(routeIdPrefix: string): void;
declare const invalidate: typeof invalidateRoute;
declare function invalidateCurrent(): void;
declare function matchPath(pattern: string, path: string): Record<string, string> | null;
declare function Route<T = any>(props: {
  id?: string;
  path: string;
  loader?: RouteLoader<T>;
  action?: RouteAction<any, any>;
  invalidateOnAction?: boolean;
  children: any | ((data: T, ctx: LoaderCtx & {
    action: ActionApi<any, any>;
  }) => any);
}): () => any;
declare function A(props: {
  href: string;
  class?: string;
  className?: string;
  children?: any;
}): VNode;
//#endregion
//#region src/resource.d.ts
interface ResourceState<T> {
  value?: T;
  loading: boolean;
  error?: any;
}
interface Resource<T> {
  (): T | undefined;
  loading: () => boolean;
  error: () => any;
  refetch: () => void;
  mutate: (val: T | undefined) => void;
  state: VAtom<ResourceState<T>>;
}
type ResourceFetcher<S, T> = (source: S, info: {
  signal: AbortSignal;
}) => Promise<T>;
interface ResourceOptions<T> {
  initialValue?: T;
  retries?: number;
  retryDelayMs?: number | ((attempt: number, error: unknown) => number);
  onError?: (error: unknown, attempt: number) => void;
}
declare function createResource<T>(fetcher: ResourceFetcher<void, T>, options?: ResourceOptions<T>): Resource<T>;
declare function createResource<T, S>(source: S | (() => S), fetcher: ResourceFetcher<S, T>, options?: ResourceOptions<T>): Resource<T>;
//#endregion
//#region src/boundary.d.ts
interface SuspenseContextValue {
  increment: () => void;
  decrement: () => void;
  state: VAtom<number>;
}
declare function Suspense(props: {
  fallback?: any;
  children: any;
}): VNode;
interface ErrorBoundaryContextValue {
  handleError: (error: any) => void;
}
declare function ErrorBoundary(props: {
  fallback: (err: any) => any;
  children: any;
}): VNode;
//#endregion
//#region src/flow.d.ts
type MaybeReactive<T> = T | (() => T);
/**
 * Conditional rendering with marker nodes
 * @example
 * <Show when={isVisible}>
 *   <Content />
 * </Show>
 */
declare function Show(props: {
  when: MaybeReactive<boolean>;
  children: VNode | (() => VNode) | (VNode | (() => VNode))[];
  fallback?: VNode | (() => VNode) | (VNode | (() => VNode))[];
}): VNode;
/**
 * List rendering with keyed reconciliation
 * @example
 * <For each={items}>
 *   {(item, index) => <li>{item.name}</li>}
 * </For>
 */
declare function For<T>(props: {
  each: MaybeReactive<T[]>;
  children: ((item: T, index: () => number) => VNode) | ((item: T, index: () => number) => VNode)[];
  key?: (item: T, index: number) => string | number;
}): VNode;
/**
 * Switch/Match for reactive pattern matching
 * @example
 * <Switch fallback={<Default />}>
 *   <Match when={() => status() === 'loading'}><Spinner /></Match>
 *   <Match when={() => status() === 'error'}><Error /></Match>
 * </Switch>
 */
interface MatchChild {
  _isMatch: true;
  when: MaybeReactive<boolean>;
  children: VNode | (() => VNode);
}
declare function Switch(props: {
  fallback?: VNode | (() => VNode);
  children: (MatchChild | VNode)[];
}): VNode;
declare function Match(props: {
  when: MaybeReactive<boolean>;
  children: VNode | (() => VNode);
}): MatchChild;
//#endregion
//#region src/render.d.ts
/**
 * Render a component to a container
 * DOM is created once. Reactive updates happen via fine-grained bindings in jsx-runtime.
 * @example
 * render(<App />, document.getElementById('root'))
 */
declare function render(component: VNode | (() => VNode), container: Element | null): (() => void);
/**
 * Hydrate a component to a container (currently aliases render)
 * TODO: Implement true hydration (attach to existing DOM)
 */
declare function hydrate(component: VNode | (() => VNode), container: Element | null): (() => void);
/**
 * Mount shorthand
 */
declare const mount: typeof render;
//#endregion
//#region src/form.d.ts
declare function Form<TInput = any>(props: {
  action: ActionApi<TInput, any>;
  /**
       * Optional explicit value.
       * If omitted, the value is collected from <input name=...> via FormData.
       */
  value?: TInput | (() => TInput);
  /**
       * When collecting from FormData, coerce common scalars:
       * - "true"/"false" -> boolean
       * - numeric strings -> number
       * - "null" -> null
       * Default: true (ergonomic for small apps)
       */
  coerce?: boolean; /** Render action error under the form when true (default: false). */
  showError?: boolean;
  children: any;
  disabled?: boolean;
}): VNode;
//#endregion
export { startTransition as $, invalidateCurrent as A, useContext as B, RouteAction as C, dehydrateLoaderCache as D, Routes as E, navigate as F, batch as G, createStore as H, prefetch as I, derive as J, createEffect as K, stableJson as L, location as M, makeRouteCacheKey as N, hydrateLoaderCache as O, matchPath as P, set as Q, Context as R, Route as S, Router as T, InitWasmOptions as U, SetStoreFunction as V, VAtom as W, initWasm as X, get as Y, onCleanup as Z, createResource as _, For as a, v as at, LoaderCtx as b, Switch as c, Suspense as d, subscribe as et, SuspenseContextValue as f, ResourceState as g, ResourceOptions as h, render as i, useValue as it, invalidateRoute as j, invalidate as k, ErrorBoundary as l, ResourceFetcher as m, hydrate as n, use as nt, Match as o, wasm as ot, Resource as p, createRoot as q, mount as r, useSet as rt, Show as s, withRenderContext as st, Form as t, untrack as tt, ErrorBoundaryContextValue as u, A as v, RouteLoader as w, Outlet as x, ActionApi as y, createContext as z };
//# sourceMappingURL=index-CdszP8bb.d.mts.map