/**
 * V-Signal: Ultra-minimal reactive state management
 * Inspired by Jotai's simplicity, powered by V WASM
 */

// === Types ===
type Getter = <T>(atom: VAtom<T>) => T
type Setter = <T>(atom: VAtom<T>, value: T | ((prev: T) => T)) => void
type Subscriber = () => void

export interface VAtom<T> {
  _brand: 'v-atom'
  init: T
  read?: (get: Getter) => T
  // WASM integration
  id?: number
  // Optimization: Direct state access
  _state?: VAtomState<T>
}

interface VAtomState<T> {
  value: T
  subscribers: Set<Subscriber>
  deps: Set<VAtom<any>>
  dependents: Set<VAtom<any>>  // atoms that depend on this atom
}

// === Render Context ===
let currentComponent: (() => void) | null = null

// === Batching ===
const pendingSubscribers = new Set<Subscriber>()
let flushPending = false

function flush() {
  flushPending = false
  const copy = [...pendingSubscribers]
  pendingSubscribers.clear()
  copy.forEach(fn => withRenderContext(fn))
}

function scheduleUpdates(subscribers: Set<Subscriber>) {
  subscribers.forEach(sub => pendingSubscribers.add(sub))
  if (!flushPending) {
    flushPending = true
    queueMicrotask(flush)
  }
}

// === Store (Global State Container) ===
// Optimization A: Removed WeakMap, state is on atom._state

// === WASM Integration ===
import { wasmBase64 } from './generated-wasm'

interface VWasmExports {
  init_graph: () => number // returns pointer
  create_node: (g: number) => number
  add_dependency: (g: number, dependent: number, dependency: number) => void
  propagate: (g: number, source: number) => number // returns count
  get_update_buffer_ptr: (g: number) => number // returns pointer
  _start: () => void
  memory: WebAssembly.Memory
}

let wasmExports: VWasmExports | null = null
let graphPtr: number = 0
let updateBufferPtr: number = 0 // Optimization C: Cache buffer pointer
let cachedUpdateBuffer: Int32Array | null = null
const UPDATE_BUFFER_SIZE = 4096

export async function initWasm(wasmPath?: string): Promise<void> {
  if (wasmExports) return

  try {
    let bytes: BufferSource
    if (wasmPath) {
      const response = await fetch(wasmPath)
      if (!response.ok) {
        console.warn('WASM not available at ' + wasmPath + ', falling back to pure JS mode')
        return
      }
      bytes = await response.arrayBuffer()
    } else {
      bytes = Uint8Array.from(atob(wasmBase64), c => c.charCodeAt(0))
    }

    const imports = {
      wasi_snapshot_preview1: {
        fd_write: (fd: number, iovs: number, iovs_len: number, nwritten: number) => 0,
        proc_exit: (code: number) => {},
      }
    };

    const result = await WebAssembly.instantiate(bytes, imports)
    wasmExports = result.instance.exports as unknown as VWasmExports

    if (wasmExports._start) {
      wasmExports._start()
    }

    // Initialize graph in WASM
    graphPtr = wasmExports.init_graph()
    updateBufferPtr = wasmExports.get_update_buffer_ptr(graphPtr)
    cachedUpdateBuffer = new Int32Array(wasmExports.memory.buffer, updateBufferPtr, UPDATE_BUFFER_SIZE)
    console.log('V-Signal WASM initialized')
  } catch (error) {
    console.warn('Failed to load WASM, using pure JS mode:', error)
    wasmExports = null
  }
}

// Optimization B: Array for ID lookup
const idToAtomArray: VAtom<any>[] = []

const fastGet: Getter = (a) => a._state ? a._state.value : getAtomState(a).value

// Helper to interact with WASM graph
function registerNodeInWasm(atom: VAtom<any>) {
  if (wasmExports && typeof atom.id === 'undefined') {
    atom.id = wasmExports.create_node(graphPtr)
    idToAtomArray[atom.id] = atom
  }
}

function registerDependencyInWasm(dependent: VAtom<any>, dependency: VAtom<any>) {
  if (wasmExports && typeof dependent.id === 'number' && typeof dependency.id === 'number') {
    wasmExports.add_dependency(graphPtr, dependent.id, dependency.id)
  }
}

function getAtomState<T>(atom: VAtom<T>): VAtomState<T> {
  // Optimization A: Direct property access
  if (atom._state) return atom._state

  const deps = new Set<VAtom<any>>()
  const trackedGet: Getter = (a) => {
    deps.add(a)
    // Direct recursive access
    if (a._state) return a._state.value
    return getAtomState(a).value
  }

  // Lazy registration for WASM
  registerNodeInWasm(atom)

  const initial = atom.read
    ? atom.read(trackedGet)
    : atom.init

  const state: VAtomState<T> = {
    value: initial,
    subscribers: new Set(),
    deps,
    dependents: new Set()
  }
  atom._state = state

  // Register this atom as a dependent of its dependencies
  deps.forEach(dep => {
    getAtomState(dep).dependents.add(atom)
    // WASM Dependency Registration
    registerNodeInWasm(dep)
    registerDependencyInWasm(atom, dep)
  })

  return state
}

// === Core API ===

export function v<T>(initial: T): VAtom<T> {
  const atom: VAtom<T> = {
    _brand: 'v-atom',
    init: initial
  }
  return atom
}

export function derive<T>(read: (get: Getter) => T): VAtom<T> {
  const atom: VAtom<T> = {
    _brand: 'v-atom',
    init: undefined as T,
    read
  }
  return atom
}

v.from = derive

// === Store Operations ===

export function get<T>(atom: VAtom<T>): T {
  const state = getAtomState(atom)
  
  if (currentComponent) {
    state.subscribers.add(currentComponent)
  }
  
  return state.value
}

export function set<T>(atom: VAtom<T>, value: T | ((prev: T) => T)): void {
  const state = getAtomState(atom)
  const newValue = typeof value === 'function'
    ? (value as (prev: T) => T)(state.value)
    : value
  
  if (state.value !== newValue) {
    state.value = newValue

    // Use WASM for propagation if available
    if (wasmExports && typeof atom.id === 'number') {
      updateDerivedWasm(atom)
    } else {
      updateDerived(atom)
    }

    // Notify direct subscribers
    scheduleUpdates(state.subscribers)
  }
}

export function subscribe<T>(atom: VAtom<T>, callback: Subscriber): () => void {
  const state = getAtomState(atom)
  state.subscribers.add(callback)
  return () => state.subscribers.delete(callback)
}

// === Derived Atom Updates (JS Fallback) ===
function updateDerived(source: VAtom<any>): void {
  const sourceState = getAtomState(source)
  const visited = new Set<VAtom<any>>()
  const queue = [...sourceState.dependents]
  
  while (queue.length > 0) {
    const atom = queue.shift()!
    if (visited.has(atom)) continue
    visited.add(atom)
    
    if (atom.read) {
      const state = getAtomState(atom)
      const newValue = atom.read((a) => getAtomState(a).value)
      
      if (state.value !== newValue) {
        state.value = newValue
        scheduleUpdates(state.subscribers)
        state.dependents.forEach(dep => queue.push(dep))
      }
    }
  }
}

// === Derived Atom Updates (WASM) ===

function updateDerivedWasm(source: VAtom<any>): void {
  if (!wasmExports || typeof source.id !== 'number') return

  const count = wasmExports.propagate(graphPtr, source.id)
  if (count > 0) {
    // Optimization C: Use cached pointer
    if (!cachedUpdateBuffer || cachedUpdateBuffer.buffer !== wasmExports.memory.buffer) {
      cachedUpdateBuffer = new Int32Array(wasmExports.memory.buffer, updateBufferPtr, UPDATE_BUFFER_SIZE)
    }

    for (let i = 0; i < count; i++) {
      const id = cachedUpdateBuffer[i]
      // Optimization B: Array access
      const atom = idToAtomArray[id]
      if (atom && atom.read) {
        // Optimization A: Direct access
        const state = atom._state!

        // Re-evaluate
        // Note: For extreme speed, we might want to optimize the `read` function's `get` arg too
        // but `getAtomState` is now fast.
        const newValue = atom.read(fastGet)

        if (state.value !== newValue) {
          state.value = newValue
          scheduleUpdates(state.subscribers)
        }
      }
    }
  }
}

// === Hook for TSX ===
type UseAtomResult<T> = [T, (value: T | ((prev: T) => T)) => void]

export function use<T>(atom: VAtom<T>): UseAtomResult<T> {
  const state = getAtomState(atom)
  
  if (currentComponent) {
    state.subscribers.add(currentComponent)
  }
  
  return [
    state.value,
    (value) => set(atom, value)
  ]
}

export function useValue<T>(atom: VAtom<T>): T {
  return use(atom)[0]
}

export function useSet<T>(atom: VAtom<T>): (value: T | ((prev: T) => T)) => void {
  return use(atom)[1]
}

export function withRenderContext(component: () => void): void {
  currentComponent = component
  try {
    component()
  } finally {
    currentComponent = null
  }
}

// Backwards compatibility/Exports for future use
export function wasm() {
    return wasmExports
}
