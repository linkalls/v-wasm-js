/**
 * Vitrio - Ultra-minimal reactive UI framework
 * Inspired by Jotai's simplicity, built with TypeScript
 */

// Core
export {
  v,
  derive,
  get,
  set,
  subscribe,
  use,
  useValue,
  useSet,
  initWasm,
  wasm,
  withRenderContext,
  onCleanup,
  createEffect,
  untrack,
  createRoot
} from './core'
export type { VAtom, InitWasmOptions } from './core'

// Store
export { createStore } from './store'
export type { SetStoreFunction } from './store'

// Context
export { createContext, useContext } from './context'
export type { Context } from './context'

// Router
export { Router, Route, A, navigate, location } from './router'

// Resource
export { createResource } from './resource'
export type { Resource, ResourceState, ResourceFetcher } from './resource'

// JSX
// Note: JSX exports are available via 'vitrio/jsx-runtime' or 'vitrio/jsx-dev-runtime'
// export { jsx, jsxs, jsxDEV, h, Fragment } from './jsx-runtime'
// export type { VNode, Props, Child, Children } from './jsx-runtime'

// Flow Control
export { Show, For, Switch, Match } from './flow'

// Render
export { render, mount } from './render'
