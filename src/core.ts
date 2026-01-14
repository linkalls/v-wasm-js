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
}

interface VAtomState<T> {
  value: T
  subscribers: Set<Subscriber>
  deps: Set<VAtom<any>>
  dependents: Set<VAtom<any>>  // atoms that depend on this atom
}

// === Render Context ===
let currentComponent: (() => void) | null = null

// === Store (Global State Container) ===
const atomStates = new WeakMap<VAtom<any>, VAtomState<any>>()

// === WASM Integration ===
interface VWasmExports {
  init_graph: () => number // returns pointer
  create_node: (g: number) => number
  add_dependency: (g: number, dependent: number, dependency: number) => void
  propagate: (g: number, source: number) => number // returns count
  get_update_buffer_ptr: (g: number) => number // returns pointer
  memory: WebAssembly.Memory
}

let wasmExports: VWasmExports | null = null
let graphPtr: number = 0

export async function initWasm(wasmPath = '/vsignal.wasm'): Promise<void> {
  if (wasmExports) return

  try {
    const response = await fetch(wasmPath)
    if (!response.ok) {
      console.warn('WASM not available, falling back to pure JS mode')
      return
    }
    const bytes = await response.arrayBuffer()
    const result = await WebAssembly.instantiate(bytes, {})
    wasmExports = result.instance.exports as unknown as VWasmExports

    // Initialize graph in WASM
    graphPtr = wasmExports.init_graph()
    console.log('V-Signal WASM initialized')
  } catch (error) {
    console.warn('Failed to load WASM, using pure JS mode:', error)
  }
}

// Helper to interact with WASM graph
function registerNodeInWasm(atom: VAtom<any>) {
  if (wasmExports && typeof atom.id === 'undefined') {
    atom.id = wasmExports.create_node(graphPtr)
  }
}

function registerDependencyInWasm(dependent: VAtom<any>, dependency: VAtom<any>) {
  if (wasmExports && typeof dependent.id === 'number' && typeof dependency.id === 'number') {
    wasmExports.add_dependency(graphPtr, dependent.id, dependency.id)
  }
}

function getAtomState<T>(atom: VAtom<T>): VAtomState<T> {
  let state = atomStates.get(atom)
  if (!state) {
    const deps = new Set<VAtom<any>>()
    const trackedGet: Getter = (a) => {
      deps.add(a)
      return getAtomState(a).value
    }

    // Lazy registration for WASM
    registerNodeInWasm(atom)

    const initial = atom.read 
      ? atom.read(trackedGet)
      : atom.init
    state = {
      value: initial,
      subscribers: new Set(),
      deps,
      dependents: new Set()
    }
    atomStates.set(atom, state)
    // Register this atom as a dependent of its dependencies
    deps.forEach(dep => {
      getAtomState(dep).dependents.add(atom)
      // WASM Dependency Registration
      registerNodeInWasm(dep)
      registerDependencyInWasm(atom, dep)
    })
  }
  return state
}

// === Core API ===

export function v<T>(initial: T): VAtom<T> {
  const atom: VAtom<T> = {
    _brand: 'v-atom',
    init: initial
  }
  // If WASM is already ready, register immediately?
  // Better to do it lazily in getAtomState to ensure order or on first access
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
    state.subscribers.forEach(fn => withRenderContext(fn))
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
      // Re-evaluate
      // Note: In a real robust system, we should track deps again in case they change dynamically
      const newValue = atom.read((a) => getAtomState(a).value)
      
      if (state.value !== newValue) {
        state.value = newValue
        state.subscribers.forEach(fn => withRenderContext(fn))
        state.dependents.forEach(dep => queue.push(dep))
      }
    }
  }
}

// === Derived Atom Updates (WASM) ===
// Map ID -> Atom for reverse lookup
const idToAtomMap = new Map<number, VAtom<any>>()

// We need to maintain this map.
// Updated registerNodeInWasm:
function registerNodeInWasmWithMap(atom: VAtom<any>) {
  if (wasmExports && typeof atom.id === 'undefined') {
    atom.id = wasmExports.create_node(graphPtr)
    idToAtomMap.set(atom.id, atom)
  }
}

// Override previous helper
registerNodeInWasm = registerNodeInWasmWithMap

function updateDerivedWasm(source: VAtom<any>): void {
  if (!wasmExports || typeof source.id !== 'number') return

  const count = wasmExports.propagate(graphPtr, source.id)
  if (count > 0) {
    const bufferPtr = wasmExports.get_update_buffer_ptr(graphPtr)
    // Read `count` integers (32-bit) from memory
    const ids = new Int32Array(wasmExports.memory.buffer, bufferPtr, count)

    // WASM returns topological order (or BFS order) of affected nodes
    for (let i = 0; i < count; i++) {
      const id = ids[i]
      const atom = idToAtomMap.get(id)
      if (atom && atom.read) {
        const state = getAtomState(atom)
        // Re-evaluate
        const newValue = atom.read((a) => getAtomState(a).value)

        if (state.value !== newValue) {
          state.value = newValue
          state.subscribers.forEach(fn => withRenderContext(fn))
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
