/**
 * V-Signal: Ultra-minimal reactive state management
 * Powered by V WASM (WASM-only runtime for maximum performance/size)
 */

type Getter = <T>(atom: VAtom<T>) => T
type Setter = <T>(atom: VAtom<T>, value: T | ((prev: T) => T)) => void
type Subscriber = () => void

export interface VAtom<T> {
  _brand: 'v-atom'
  init: T
  read?: (get: Getter) => T
  id?: number
  _state?: VAtomState<T>
}

interface VAtomState<T> {
  value: T
  subscribers: Set<Subscriber>
  // deps/dependents managed by WASM
}

let currentComponent: (() => void) | null = null
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

import { wasmBase64 } from './generated-wasm'

interface VWasmExports {
  init_graph: () => number
  create_node: (g: number) => number
  add_dependency: (g: number, dependent: number, dependency: number) => void
  propagate: (g: number, source: number) => number
  get_update_buffer_ptr: (g: number) => number
  _start: () => void
  memory: WebAssembly.Memory
}

let wasmExports: VWasmExports | null = null
let graphPtr: number = 0
let updateBufferPtr: number = 0
let cachedUpdateBuffer: Int32Array | null = null
const UPDATE_BUFFER_SIZE = 4096

export async function initWasm(wasmPath?: string): Promise<void> {
  if (wasmExports) return

  try {
    const imports = {
      wasi_snapshot_preview1: {
        fd_write: () => 0,
        proc_exit: () => {},
      }
    };

    const path = wasmPath || (wasmBase64 ? null : '/vsignal.wasm')
    let instance: WebAssembly.Instance

    if (path) {
      try {
        const res = await WebAssembly.instantiateStreaming(fetch(path), imports)
        instance = res.instance
      } catch (e) {
        const response = await fetch(path)
        const bytes = await response.arrayBuffer()
        const res = await WebAssembly.instantiate(bytes, imports)
        instance = res.instance
      }
    } else {
      const bytes = Uint8Array.from(atob(wasmBase64), c => c.charCodeAt(0))
      const res = await WebAssembly.instantiate(bytes, imports)
      instance = res.instance
    }

    wasmExports = (instance.exports as any) as unknown as VWasmExports

    const REQUIRED_BYTES = 1.5 * 1024 * 1024
    const PAGE_SIZE = 65536
    const currentBytes = wasmExports.memory.buffer.byteLength
    const neededPages = Math.ceil((REQUIRED_BYTES - currentBytes) / PAGE_SIZE)
    if (neededPages > 0) {
      try { wasmExports.memory.grow(neededPages) } catch (e) {}
    }

    graphPtr = wasmExports.init_graph()
    updateBufferPtr = wasmExports.get_update_buffer_ptr(graphPtr)
    cachedUpdateBuffer = new Int32Array(wasmExports.memory.buffer, updateBufferPtr, UPDATE_BUFFER_SIZE)
  } catch (error) {
    // console.warn removed for size
    wasmExports = null
  }
}

const idToAtomArray: VAtom<any>[] = []
const fastGet: Getter = (a) => a._state ? a._state.value : getAtomState(a).value

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
  if (atom._state) return atom._state

  // Only track deps during initialization for WASM registration
  const trackedGet: Getter = (a) => {
    // Register dependency
    registerNodeInWasm(a)
    registerDependencyInWasm(atom, a)

    if (a._state) return a._state.value
    return getAtomState(a).value
  }

  registerNodeInWasm(atom)

  const initial = atom.read
    ? atom.read(trackedGet)
    : atom.init

  const state: VAtomState<T> = {
    value: initial,
    subscribers: new Set()
  }
  atom._state = state
  return state
}

export function v<T>(initial: T): VAtom<T> {
  return { _brand: 'v-atom', init: initial }
}

export function derive<T>(read: (get: Getter) => T): VAtom<T> {
  return { _brand: 'v-atom', init: undefined as T, read }
}

v.from = derive

export function get<T>(atom: VAtom<T>): T {
  const state = getAtomState(atom)
  if (currentComponent) state.subscribers.add(currentComponent)
  return state.value
}

export function set<T>(atom: VAtom<T>, value: T | ((prev: T) => T)): void {
  const state = getAtomState(atom)
  const newValue = typeof value === 'function'
    ? (value as (prev: T) => T)(state.value)
    : value
  
  if (state.value !== newValue) {
    state.value = newValue

    if (wasmExports && typeof atom.id === 'number') {
      updateDerivedWasm(atom)
    }
    scheduleUpdates(state.subscribers)
  }
}

export function subscribe<T>(atom: VAtom<T>, callback: Subscriber): () => void {
  const state = getAtomState(atom)
  state.subscribers.add(callback)
  return () => state.subscribers.delete(callback)
}

function updateDerivedWasm(source: VAtom<any>): void {
  if (!wasmExports || typeof source.id !== 'number') return

  const count = wasmExports.propagate(graphPtr, source.id)
  if (count > 0) {
    if (!cachedUpdateBuffer || cachedUpdateBuffer.buffer !== wasmExports.memory.buffer) {
      cachedUpdateBuffer = new Int32Array(wasmExports.memory.buffer, updateBufferPtr, UPDATE_BUFFER_SIZE)
    }

    for (let i = 0; i < count; i++) {
      const id = cachedUpdateBuffer[i]
      const atom = idToAtomArray[id]
      if (atom && atom.read) {
        const state = atom._state!
        const newValue = atom.read(fastGet)
        if (state.value !== newValue) {
          state.value = newValue
          scheduleUpdates(state.subscribers)
        }
      }
    }
  }
}

export function use<T>(atom: VAtom<T>): [T, (value: T | ((prev: T) => T)) => void] {
  const state = getAtomState(atom)
  if (currentComponent) state.subscribers.add(currentComponent)
  return [state.value, (value) => set(atom, value)]
}

export function useValue<T>(atom: VAtom<T>): T {
  return use(atom)[0]
}

export function useSet<T>(atom: VAtom<T>): (value: T | ((prev: T) => T)) => void {
  return use(atom)[1]
}

export function withRenderContext(component: () => void): void {
  currentComponent = component
  try { component() } finally { currentComponent = null }
}

export function wasm() { return wasmExports }
