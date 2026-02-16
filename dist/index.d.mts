import { c as VNode } from "./jsx-runtime-9zcxrKau.mjs";

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
  path: string;
  query: string;
  hash: string;
}
declare const location: VAtom<LocationState>;
declare function navigate(to: string): void;
declare function Router(props: {
  children: any;
}): any;
declare function Route(props: {
  path: string;
  children: any;
}): VNode;
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
 * Mount shorthand
 */
declare const mount: typeof render;
//#endregion
export { A, type Context, ErrorBoundary, type ErrorBoundaryContextValue, For, type InitWasmOptions, Match, type Resource, type ResourceFetcher, type ResourceOptions, type ResourceState, Route, Router, type SetStoreFunction, Show, Suspense, type SuspenseContextValue, Switch, type VAtom, batch, createContext, createEffect, createResource, createRoot, createStore, derive, get, initWasm, location, mount, navigate, onCleanup, render, set, startTransition, subscribe, untrack, use, useContext, useSet, useValue, v, wasm, withRenderContext };
//# sourceMappingURL=index.d.mts.map