# Runtime Spec (Performance-first)

This doc describes the **runtime behavior that should remain stable** as Vitrio evolves.
It exists to protect performance and prevent accidental semantic drift.

> Scope: `@potetotown/vitrio` runtime (reactivity, scheduling, effects, cleanup).
> Non-goals: React API compatibility. Vitrio aims to be a **React alternative**, not a clone.

## Core Principles

1. **Fine-grained reactivity**: updates propagate only to dependents that actually read a value.
2. **DOM updates over VDOM diff**: create nodes once, update bindings.
3. **Performance-first semantics**: avoid unnecessary propagation/notifications.
4. **WASM is an optional accelerator**: correctness must not depend on WASM.

---

## Reactivity Model

### Atoms

- An *atom* represents a reactive cell.
- `get(atom)` returns the current value.
- When `get(atom)` is called during tracking, the current subscriber becomes a dependent of that atom.

### Derived values

- `derive(fn)` creates a derived atom.
- Derived atoms track dependencies by calling `get()` within `fn`.
- Derived atoms are **memoized**: recompute only when invalidated by upstream changes.

### Dependency tracking

- Tracking is automatic within reactive contexts (e.g. render bindings, effects).
- `untrack(fn)` executes `fn` without recording dependencies.

---

## Update Semantics

### `set(atom, next)`

1. Compute the next value:
   - If `next` is a function: `computed = next(prev)`
   - Else: `computed = next`
2. If `Object.is(prev, computed)` is `true`, then:
   - **No state change occurs**
   - **No notifications occur**
   - **No dependency propagation occurs**
3. Otherwise, update the atom and schedule propagation.

> This `Object.is` short-circuit is part of the performance contract.

### Batching & flushing

- `batch(fn)` groups multiple `set()` calls.
- While batching, dependent notifications are accumulated.
- When the outermost `batch()` exits, a flush is scheduled.

**Flush timing**
- Default flush should be **microtask-based** (e.g. `queueMicrotask`) to collapse bursts of updates.

---

## Effects & Cleanup

### `createEffect(fn)`

- Runs `fn` in a tracking context.
- When any dependency changes, re-runs `fn`.
- Cleanup behavior:
  - cleanup handlers registered via `onCleanup()` run **before** the next re-run
  - and run when the owning root/subscriber is disposed

### `createRoot(fn)`

- Creates an isolated reactive root.
- Disposing the root:
  - stops further notifications
  - runs all cleanups
  - releases subscriptions

---

## DOM Bindings

- UI bindings should update **only the minimal affected DOM nodes**.
- Removing a DOM node must dispose associated subscriptions/cleanups.

---

## WASM Integration

- WASM may be used to accelerate dependency graph operations (e.g. propagation).
- **Correctness must not depend on WASM.**
- If WASM fails to load or initialize, Vitrio must continue to work using the JS implementation.

---

## Compatibility Notes

- Vitrio intentionally does not guarantee React hook compatibility.
- The goal is to support building the same *kinds* of apps as React (routing, async UI, boundaries),
  with a smaller, faster runtime.
