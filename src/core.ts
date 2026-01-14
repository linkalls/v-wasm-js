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
}

// === Render Context ===
let currentComponent: (() => void) | null = null

// === Store (Global State Container) ===
const atomStates = new WeakMap<VAtom<any>, VAtomState<any>>()

function getAtomState<T>(atom: VAtom<T>): VAtomState<T> {
  let state = atomStates.get(atom)
  if (!state) {
    const initial = atom.read 
      ? atom.read((a) => getAtomState(a).value)
      : atom.init
    state = {
      value: initial,
      subscribers: new Set(),
      deps: new Set()
    }
    atomStates.set(atom, state)
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
  derivedAtoms.forEach(atom => {
    if (atom.read) {
      const state = getAtomState(atom)
      const deps = new Set<VAtom<any>>()
      
      // Track dependencies during read
      const trackedGet: Getter = (a) => {
        deps.add(a)
        return getAtomState(a).value
      }
      
      const newValue = atom.read(trackedGet)
      state.deps = deps
      
      if (state.value !== newValue) {
        state.value = newValue
        state.subscribers.forEach(fn => withRenderContext(fn))
      }
    }
  })
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

let wasmModule: VWasm | null = null

export async function initWasm(): Promise<VWasm> {
  if (wasmModule) return wasmModule
  
  const response = await fetch('/vsignal.wasm')
  const bytes = await response.arrayBuffer()
  const result = await WebAssembly.instantiate(bytes, {})
  wasmModule = result.instance.exports as unknown as VWasm
  return wasmModule
}

export function wasm(): VWasm {
  if (!wasmModule) throw new Error('WASM not initialized. Call initWasm() first.')
  return wasmModule
}
