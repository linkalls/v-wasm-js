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
  dependents: Set<VAtom<any>>  // atoms that depend on this atom
}

// === Render Context ===
let currentComponent: (() => void) | null = null

// === Store (Global State Container) ===
const atomStates = new WeakMap<VAtom<any>, VAtomState<any>>()

function getAtomState<T>(atom: VAtom<T>): VAtomState<T> {
  let state = atomStates.get(atom)
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
      dependents: new Set()
    }
    atomStates.set(atom, state)
    // Register this atom as a dependent of its dependencies
    deps.forEach(dep => {
      getAtomState(dep).dependents.add(atom)
    })
  }
  return state
}

// === Core API ===

/**
 * Create a reactive value
 * @example
 * const count = v(0)
 * const name = v('hello')
 * const user = v({ id: 1, name: 'John' })
 */
export function v<T>(initial: T): VAtom<T> {
  return {
    _brand: 'v-atom',
    init: initial
  }
}

/**
 * Create a derived value from other atoms
 * @example
 * const count = v(0)
 * const doubled = derive(get => get(count) * 2)
 */
export function derive<T>(read: (get: Getter) => T): VAtom<T> {
  const atom: VAtom<T> = {
    _brand: 'v-atom',
    init: undefined as T,
    read
  }
  derivedAtoms.add(atom)
  return atom
}

// Alias for backwards compatibility
v.from = derive

// === Store Operations ===

/**
 * Get atom value
 * If called inside a render context (e.g., reactive text node), auto-subscribes
 */
export function get<T>(atom: VAtom<T>): T {
  const state = getAtomState(atom)
  
  // Auto-subscribe if inside render context
  if (currentComponent) {
    state.subscribers.add(currentComponent)
  }
  
  return state.value
}

/**
 * Set atom value
 */
export function set<T>(atom: VAtom<T>, value: T | ((prev: T) => T)): void {
  const state = getAtomState(atom)
  const newValue = typeof value === 'function'
    ? (value as (prev: T) => T)(state.value)
    : value
  
  if (state.value !== newValue) {
    state.value = newValue
    // Update derived atoms FIRST so they're in sync
    updateDerived(atom)
    // Then notify subscribers (run each subscriber inside render context)
    state.subscribers.forEach(fn => withRenderContext(fn))
  }
}

/**
 * Subscribe to atom changes
 */
export function subscribe<T>(atom: VAtom<T>, callback: Subscriber): () => void {
  const state = getAtomState(atom)
  state.subscribers.add(callback)
  return () => state.subscribers.delete(callback)
}

// === Derived Atom Updates ===
const derivedAtoms = new Set<VAtom<any>>()

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
        state.subscribers.forEach(fn => withRenderContext(fn))
        // Add dependents of this atom to the queue
        state.dependents.forEach(dep => queue.push(dep))
      }
    }
  }
}

// Note: derived atom registration is now done in derive() function

// === Hook for TSX ===
type UseAtomResult<T> = [T, (value: T | ((prev: T) => T)) => void]

/**
 * Use atom in components - triggers re-render on change
 * @example
 * const [count, setCount] = use(countAtom)
 */
export function use<T>(atom: VAtom<T>): UseAtomResult<T> {
  const state = getAtomState(atom)
  
  // Auto-subscribe if inside component render
  if (currentComponent) {
    state.subscribers.add(currentComponent)
  }
  
  return [
    state.value,
    (value) => set(atom, value)
  ]
}

/**
 * Read-only hook
 */
export function useValue<T>(atom: VAtom<T>): T {
  return use(atom)[0]
}

/**
 * Write-only hook
 */
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

// === WASM Integration (for future heavy computations) ===
interface VWasm {
  add: (a: number, b: number) => number
  sub: (a: number, b: number) => number
  fib: (n: number) => number
}

// JS fallback implementation
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
    // Check WASM magic number
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
