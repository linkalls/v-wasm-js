/**
 * V-Signal: Ultra-minimal reactive state management
 * Inspired by Jotai's simplicity, powered by V WASM
 */

// === Types ===
type Getter = <T>(atom: VAtom<T>) => T;
type Setter = <T>(atom: VAtom<T>, value: T | ((prev: T) => T)) => void;
type Subscriber = () => void;
type DependencySet = Set<VAtom<any>>;

export interface VAtom<T> {
  _brand: "v-atom";
  init: T;
  read?: (get: Getter) => T;
  // WASM integration
  id?: number;
  // Optimization: Direct state access
  _state?: VAtomState<T>;
}

interface VAtomState<T> {
  value: T;
  subscribers: Set<Subscriber>;
  deps: Set<VAtom<any>>;
  dependents: Set<VAtom<any>>; // atoms that depend on this atom
}

// === Render Context ===
let currentComponent: (() => void) | null = null;
let currentDeps: DependencySet | null = null;
const componentDeps = new WeakMap<Subscriber, DependencySet>();

// === Batching ===
const pendingSubscribers = new Set<Subscriber>();
let flushPending = false;

function flush() {
  flushPending = false;
  const copy = Array.from(pendingSubscribers);
  pendingSubscribers.clear();
  const len = copy.length;
  for (let i = 0; i < len; i++) {
    withRenderContext(copy[i]);
  }
}

function scheduleUpdates(subscribers: Set<Subscriber>) {
  subscribers.forEach(pendingSubscribers.add, pendingSubscribers);
  if (!flushPending) {
    flushPending = true;
    queueMicrotask(flush);
  }
}

// === Store (Global State Container) ===
// Optimization A: Removed WeakMap, state is on atom._state

// === WASM Integration ===

interface VWasmExports {
  init_graph: () => number; // returns pointer
  create_node: (g: number) => number;
  add_dependency: (g: number, dependent: number, dependency: number) => void;
  propagate: (g: number, source: number) => number; // returns count
  get_update_buffer_ptr: (g: number) => number; // returns pointer
  _start: () => void;
  memory: WebAssembly.Memory;
}

let wasmExports: VWasmExports | null = null;
let graphPtr: number = 0;
let updateBufferPtr: number = 0; // Optimization C: Cache buffer pointer
let cachedUpdateBuffer: Int32Array | null = null;
const UPDATE_BUFFER_SIZE = 4096;

type InitWasmPhase = "fetch" | "compile" | "setup";
export interface InitWasmOptions {
  wasmPath?: string;
  // Skip network fetch when the module is precompiled/bundled
  module?: WebAssembly.Module | Promise<WebAssembly.Module>;
  // Optional perf hook for profiling startup
  onPerf?: (phase: InitWasmPhase, durationMs: number) => void;
}

let wasmInitPromise: Promise<void> | null = null;

export async function initWasm(
  options?: string | InitWasmOptions,
): Promise<void> {
  if (wasmExports) return;
  if (wasmInitPromise) return wasmInitPromise;

  const opts: InitWasmOptions =
    typeof options === "string" ? { wasmPath: options } : options || {};
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? () => performance.now()
      : () => Date.now();
  const measure = <T>(
    phase: InitWasmPhase,
    run: () => Promise<T>,
  ): Promise<T> => {
    if (!opts.onPerf) return run();
    const start = now();
    return run().then((result) => {
      opts.onPerf!(phase, now() - start);
      return result;
    });
  };

  const imports = {
    wasi_snapshot_preview1: {
      fd_write: (
        _fd: number,
        _iovs: number,
        _iovs_len: number,
        _nwritten: number,
      ) => 0,
      proc_exit: (_code: number) => {},
    },
  };

  wasmInitPromise = (async () => {
    let succeeded = false;
    try {
      let instantiated:
        | WebAssembly.WebAssemblyInstantiatedSource
        | WebAssembly.Instance
        | null = null;

      if (opts.module) {
        const module = await opts.module;
        instantiated = await measure("compile", () =>
          WebAssembly.instantiate(module, imports),
        );
      } else {
        const url =
          opts.wasmPath ||
          new URL("../dist/vsignal.wasm", import.meta.url).href;
        const response = await measure("fetch", () => fetch(url));

        if (!response.ok) {
          console.error(
            `Failed to load WASM: ${response.status} ${response.statusText}`,
          );
          return;
        }

        if (typeof WebAssembly.instantiateStreaming === "function") {
          try {
            instantiated = await measure("compile", () =>
              WebAssembly.instantiateStreaming(response.clone(), imports),
            );
          } catch {
            // Some servers do not return the correct MIME type; fall through to arrayBuffer
          }
        }

        if (!instantiated) {
          const bytes = await response.arrayBuffer();
          instantiated = await measure("compile", () =>
            WebAssembly.instantiate(bytes, imports),
          );
        }
      }

      if (!instantiated) {
        return;
      }

      const exports =
        "instance" in instantiated
          ? instantiated.instance.exports
          : instantiated.exports;
      wasmExports = exports as unknown as VWasmExports;

      await measure("setup", async () => {
        // Initialize graph in WASM
        // Calculate required memory: Graph struct (~1MB) + Safety Margin (~1MB) = 2MB total
        const GRAPH_SIZE = 1024 * 1024;
        const SAFETY_MARGIN = 1024 * 1024;
        const REQUIRED_BYTES = GRAPH_SIZE + SAFETY_MARGIN;
        const PAGE_SIZE = 65536;

        const currentBytes = wasmExports!.memory.buffer.byteLength;
        const neededPages = Math.ceil(
          (REQUIRED_BYTES - currentBytes) / PAGE_SIZE,
        );

        if (neededPages > 0) {
          try {
            wasmExports!.memory.grow(neededPages);
          } catch {
            // Ignore if memory is already large enough or fixed
          }
        }

        graphPtr = wasmExports!.init_graph();
        updateBufferPtr = wasmExports!.get_update_buffer_ptr(graphPtr);
        cachedUpdateBuffer = new Int32Array(
          wasmExports!.memory.buffer,
          updateBufferPtr,
          UPDATE_BUFFER_SIZE,
        );
      });
      succeeded = true;
    } catch (error) {
      wasmExports = null;
      wasmInitPromise = null;
    } finally {
      if (!succeeded) {
        wasmInitPromise = null;
      }
    }
  })();

  return wasmInitPromise!;
}

// Optimization B: Array for ID lookup
const idToAtomArray: VAtom<any>[] = [];

const fastGet: Getter = (a) =>
  a._state ? a._state.value : getAtomState(a).value;

function trackSubscriber<T>(state: VAtomState<T>, atom: VAtom<T>): void {
  if (currentComponent) {
    state.subscribers.add(currentComponent);
    if (currentDeps) {
      currentDeps.add(atom);
    }
  }
}

function cleanupComponent(component: Subscriber): void {
  const deps = componentDeps.get(component);
  if (!deps) return;

  // for-of is faster than forEach
  for (const atom of deps) {
    const st = atom._state;
    if (st) {
      st.subscribers.delete(component);
    }
  }

  componentDeps.delete(component);
  pendingSubscribers.delete(component);
}

// Helper to interact with WASM graph
function registerNodeInWasm(atom: VAtom<any>) {
  if (wasmExports && typeof atom.id === "undefined") {
    atom.id = wasmExports.create_node(graphPtr);
    idToAtomArray[atom.id] = atom;
  }
}

function registerDependencyInWasm(
  dependent: VAtom<any>,
  dependency: VAtom<any>,
) {
  if (
    wasmExports &&
    typeof dependent.id === "number" &&
    typeof dependency.id === "number"
  ) {
    wasmExports.add_dependency(graphPtr, dependent.id, dependency.id);
  }
}

function getAtomState<T>(atom: VAtom<T>): VAtomState<T> {
  // Optimization A: Direct property access
  if (atom._state) return atom._state;

  const deps = new Set<VAtom<any>>();
  const trackedGet: Getter = (a) => {
    deps.add(a);
    // Direct recursive access
    if (a._state) return a._state.value;
    return getAtomState(a).value;
  };

  // Lazy registration for WASM
  registerNodeInWasm(atom);

  const initial = atom.read ? atom.read(trackedGet) : atom.init;

  const state: VAtomState<T> = {
    value: initial,
    subscribers: new Set(),
    deps,
    dependents: new Set(),
  };
  atom._state = state;

  // Register this atom as a dependent of its dependencies
  for (const dep of deps) {
    getAtomState(dep).dependents.add(atom);
    // WASM Dependency Registration
    registerNodeInWasm(dep);
    registerDependencyInWasm(atom, dep);
  }

  return state;
}

// === Core API ===

export function v<T>(initial: T): VAtom<T> {
  const atom: VAtom<T> = {
    _brand: "v-atom",
    init: initial,
  };
  return atom;
}

export function derive<T>(read: (get: Getter) => T): VAtom<T> {
  const atom: VAtom<T> = {
    _brand: "v-atom",
    init: undefined as T,
    read,
  };
  return atom;
}

v.from = derive;

// === Store Operations ===

export function get<T>(atom: VAtom<T>): T {
  const state = getAtomState(atom);
  trackSubscriber(state, atom);
  return state.value;
}

export function set<T>(atom: VAtom<T>, value: T | ((prev: T) => T)): void {
  const state = getAtomState(atom);
  const newValue =
    typeof value === "function"
      ? (value as (prev: T) => T)(state.value)
      : value;

  if (state.value !== newValue) {
    state.value = newValue;

    // Use WASM for propagation if available
    if (wasmExports && typeof atom.id === "number") {
      updateDerivedWasm(atom);
    } else {
      updateDerived(atom);
    }

    // Notify direct subscribers
    scheduleUpdates(state.subscribers);
  }
}

export function subscribe<T>(atom: VAtom<T>, callback: Subscriber): () => void {
  const state = getAtomState(atom);
  state.subscribers.add(callback);
  return () => state.subscribers.delete(callback);
}

// === Derived Atom Updates (JS Fallback) ===
function updateDerived(source: VAtom<any>): void {
  const sourceState = getAtomState(source);
  const visited = new Set<VAtom<any>>();
  // Array.from is more efficient than spread for Set
  const queue = Array.from(sourceState.dependents);

  let i = 0;
  while (i < queue.length) {
    const atom = queue[i++];
    if (visited.has(atom)) continue;
    visited.add(atom);

    if (atom.read) {
      const state = getAtomState(atom);
      const newValue = atom.read((a) => getAtomState(a).value);

      if (state.value !== newValue) {
        state.value = newValue;
        scheduleUpdates(state.subscribers);
        // for-of faster than forEach
        for (const dep of state.dependents) {
          queue.push(dep);
        }
      }
    }
  }
}

// === Derived Atom Updates (WASM) ===

function updateDerivedWasm(source: VAtom<any>): void {
  if (!wasmExports || typeof source.id !== "number") return;

  const count = wasmExports.propagate(graphPtr, source.id);
  if (count > 0) {
    // Optimization C: Use cached pointer
    if (
      !cachedUpdateBuffer ||
      cachedUpdateBuffer.buffer !== wasmExports.memory.buffer
    ) {
      cachedUpdateBuffer = new Int32Array(
        wasmExports.memory.buffer,
        updateBufferPtr,
        UPDATE_BUFFER_SIZE,
      );
    }

    for (let i = 0; i < count; i++) {
      const id = cachedUpdateBuffer[i];
      // Optimization B: Array access
      const atom = idToAtomArray[id];
      if (atom && atom.read) {
        // Optimization A: Direct access
        const state = atom._state!;

        // Re-evaluate
        // Note: For extreme speed, we might want to optimize the `read` function's `get` arg too
        // but `getAtomState` is now fast.
        const newValue = atom.read(fastGet);

        if (state.value !== newValue) {
          state.value = newValue;
          scheduleUpdates(state.subscribers);
        }
      }
    }
  }
}

// === Hook for TSX ===
type UseAtomResult<T> = [T, (value: T | ((prev: T) => T)) => void];

export function use<T>(atom: VAtom<T>): UseAtomResult<T> {
  const state = getAtomState(atom);
  trackSubscriber(state, atom);
  return [state.value, (value) => set(atom, value)];
}

export function useValue<T>(atom: VAtom<T>): T {
  return use(atom)[0];
}

export function useSet<T>(
  atom: VAtom<T>,
): (value: T | ((prev: T) => T)) => void {
  return use(atom)[1];
}

export function withRenderContext(component: () => void): void {
  cleanupComponent(component);
  const deps: DependencySet = new Set();
  componentDeps.set(component, deps);

  const prevComponent = currentComponent;
  const prevDeps = currentDeps;
  currentComponent = component;
  currentDeps = deps;
  try {
    component();
  } finally {
    currentComponent = prevComponent;
    currentDeps = prevDeps;
  }
}

// Backwards compatibility/Exports for future use
export function wasm() {
  return wasmExports;
}

export function disposeEffect(component: Subscriber): void {
  cleanupComponent(component);
}
