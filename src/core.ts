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
}

interface VAtomState<T> {
  value: T
  subscribers: Set<Subscriber>
  deps: Set<VAtom<any>>
  dependents: Set<VAtom<any>>
  lastSeenEpoch: number
}

// === Render Context ===
let currentComponent: (() => void) | null = null

// === Store (Global State Container) ===
// Optimization: Storing state on the atom itself avoids WeakMap lookup overhead
// const atomStates = new WeakMap<VAtom<any>, VAtomState<any>>()

function getAtomState<T>(atom: VAtom<T>): VAtomState<T> {
  let state = (atom as any)._state
  if (!state) {
    const deps = new Set<VAtom<any>>()
    const trackedGet: Getter = (a) => {
      deps.add(a)
      return getAtomState(a).value
    }
    const initial = atom.read 
      ? atom.read(trackedGet)
      : atom.init
    state = {
      value: initial,
      subscribers: new Set(),
      deps,
      dependents: new Set(),
      lastSeenEpoch: 0
    }
    ;(atom as any)._state = state

    // Register this atom as a dependent of its dependencies
    deps.forEach(dep => {
      getAtomState(dep).dependents.add(atom)
    })
  }
  return state
}

// === Core API ===

export function v<T>(initial: T): VAtom<T> {
  return {
    _brand: 'v-atom',
    init: initial
  }
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
    updateDerived(atom)
    // Notify subscribers
    if (state.subscribers.size > 0) {
      state.subscribers.forEach(fn => withRenderContext(fn))
    }
  }
}

export function subscribe<T>(atom: VAtom<T>, callback: Subscriber): () => void {
  const state = getAtomState(atom)
  state.subscribers.add(callback)
  return () => state.subscribers.delete(callback)
}

// === Derived Atom Updates ===
// Optimization: Reusing queue and using epoch for visited check to avoid allocation
const updateQueue: VAtom<any>[] = []
let updateEpoch = 0
let isUpdating = false

function updateDerived(source: VAtom<any>): void {
  const sourceState = getAtomState(source)
  if (sourceState.dependents.size === 0) return

  // Handle re-entrancy
  if (isUpdating) {
    return updateDerivedAllocated(sourceState)
  }

  isUpdating = true
  updateEpoch++ // Increment epoch for this propagation cycle

  try {
    updateQueue.length = 0

    // Fill queue
    sourceState.dependents.forEach(dep => {
      updateQueue.push(dep)
    })

    let i = 0
    while (i < updateQueue.length) {
      const atom = updateQueue[i++]
      const state = getAtomState(atom)

      // Visited check using epoch
      if (state.lastSeenEpoch === updateEpoch) continue
      state.lastSeenEpoch = updateEpoch

      if (atom.read) {
        const newValue = atom.read((a) => getAtomState(a).value)

        if (state.value !== newValue) {
          state.value = newValue
          if (state.subscribers.size > 0) {
            state.subscribers.forEach(fn => withRenderContext(fn))
          }
          // Add dependents
          state.dependents.forEach(dep => updateQueue.push(dep))
        }
      }
    }
  } finally {
    isUpdating = false
    updateQueue.length = 0
  }
}

function updateDerivedAllocated(sourceState: VAtomState<any>): void {
  const visited = new Set<VAtom<any>>()
  const queue: VAtom<any>[] = []
  sourceState.dependents.forEach(d => queue.push(d))
  
  let i = 0
  while (i < queue.length) {
    const atom = queue[i++]
    if (visited.has(atom)) continue
    visited.add(atom)
    
    if (atom.read) {
      const state = getAtomState(atom)
      const newValue = atom.read((a) => getAtomState(a).value)
      
      if (state.value !== newValue) {
        state.value = newValue
        if (state.subscribers.size > 0) {
          state.subscribers.forEach(fn => withRenderContext(fn))
        }
        state.dependents.forEach(dep => queue.push(dep))
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
  return [state.value, (value) => set(atom, value)]
}

export function useValue<T>(atom: VAtom<T>): T {
  return use(atom)[0]
}

export function useSet<T>(atom: VAtom<T>): (value: T | ((prev: T) => T)) => void {
  return use(atom)[1]
}

// === Component Render Context ===
export function withRenderContext(component: () => void): void {
  currentComponent = component
  try {
    component()
  } finally {
    currentComponent = null
  }
}

// === WASM Integration ===
interface VWasm {
  add: (a: number, b: number) => number
  sub: (a: number, b: number) => number
  fib: (n: number) => number
}

const jsFallback: VWasm = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  fib: (n) => {
    if (n <= 1) return n
    let a = 0, b = 1
    for (let i = 2; i <= n; i++) {
      const c = a + b
      a = b
      b = c
    }
    return b
  }
}

let wasmModule: VWasm | null = null

export async function initWasm(wasmPath = '/vsignal.wasm'): Promise<VWasm> {
  if (wasmModule) return wasmModule
  
  try {
    const response = await fetch(wasmPath)
    if (!response.ok) {
      console.warn('WASM not available, using JS fallback')
      wasmModule = jsFallback
      return wasmModule
    }
    const bytes = await response.arrayBuffer()
    const magic = new Uint8Array(bytes.slice(0, 4))
    if (magic[0] !== 0x00 || magic[1] !== 0x61 || magic[2] !== 0x73 || magic[3] !== 0x6d) {
      console.warn('Invalid WASM file, using JS fallback')
      wasmModule = jsFallback
      return wasmModule
    }
    const result = await WebAssembly.instantiate(bytes, {})
    wasmModule = result.instance.exports as unknown as VWasm
    return wasmModule
  } catch (error) {
    console.warn('Failed to load WASM, using JS fallback:', error)
    wasmModule = jsFallback
    return wasmModule
  }
}

export function wasm(): VWasm {
  if (!wasmModule) throw new Error('WASM not initialized. Call initWasm() first.')
  return wasmModule
}
