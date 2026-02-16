# Vitrio

**Ultra-minimal reactive UI framework** - Jotai-inspired simplicity with React-like TSX.

[![npm version](https://badge.fury.io/js/@potetotown%2Fvitrio.svg)](https://www.npmjs.com/package/@potetotown/vitrio)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

English | [日本語](./README.ja.md)

## 🚀 Performance

**Benchmark snapshot (2026-01-17):**

| Metric | Vitrio (WASM) | SolidJS | React |
|--------|---------------|---------|-------|
| Bundle Size (bytes) | 11881 | 12970 | 144132 |
| Avg Load Time (ms) | 14.34 | 36.22 | 40.52 |
| Interaction (100 clicks) (ms) | 2.18 | 10.17 | 11.26 |
| List Update (50 add, 25 remove) (ms) | 2.95 | 11.31 | 8.75 |

- **Counter (100 clicks):** 366.5% faster than Solid, 416.6% faster than React.
- **List updates:** 283.9% faster than Solid.

> 📊 See [results.md](./results.md) and [docs/benchmarks.md](./docs/benchmarks.md) for full details.

## Features

- 🎯 **Minimal API** - `v()`, `derive()`, `get()`, `set()`, `batch()`, `startTransition()`
- ⚡ **Reactive** - Fine-grained updates with automatic dependency tracking
- 🏎️ **Solid-style DOM** - Create once, update bindings (no VDOM diffing)
- 🎨 **React-like TSX** - Write components naturally with JSX
- 📦 **Tiny** - ~12KB minified
- 🧹 **Auto-cleanup** - Reactive bindings are disposed when nodes are removed
- 🔧 **Bun-first** - Built for modern tooling
- 🏬 **Store** - Complex state management with `createStore`
- 🌐 **Context** - Dependency injection with `createContext`
- 🛣️ **Router** - Built-in history routing
- 🔄 **Resources** - Async data fetching with `createResource`
- 🛡️ **Robust** - Built-in Suspense and Error Boundaries

## Installation

```bash
bun add @potetotown/vitrio
# or
npm install @potetotown/vitrio
```

## Quick Start

```tsx
import { v, derive, get, set, render } from "@potetotown/vitrio";

// 1. Create reactive state
const count = v(0);
const doubled = derive((get) => get(count) * 2);

// 2. Write React-like components
function Counter() {
  return (
    <div>
      <button onClick={() => set(count, (c) => c - 1)}>-</button>
      <span>{() => get(count)}</span>
      <span style="color: gray">(×2 = {() => get(doubled)})</span>
      <button onClick={() => set(count, (c) => c + 1)}>+</button>
    </div>
  );
}

// 3. Render
render(<Counter />, document.getElementById("app"));
```

## Runtime Spec

Performance-first behavior that should remain stable over time:
- [docs/runtime-spec.md](./docs/runtime-spec.md)

## Introduction

- [docs/introduction/tutorial.md](./docs/introduction/tutorial.md)

## Core Concepts

### Atoms with `v()`

Create reactive values:

```tsx
const name = v("John");
const age = v(25);
const user = v({ id: 1, role: "admin" });
```

### Derived State with `derive()`

Computed values that auto-update:

```tsx
const count = v(10);
const doubled = derive((get) => get(count) * 2); // 20
const message = derive((get) => `Count: ${get(count)}`);
```

### Reading & Writing

```tsx
// Read
const currentCount = get(count);

// Write
set(count, 5); // Direct value
set(count, (c) => c + 1); // Updater function
```

### Reactive Text Nodes

Use functions in JSX for auto-updating text:

```tsx
<span>{() => get(count)}</span> // Re-renders when count changes
```

### Reactive Attributes

Attributes can also be reactive functions:

```tsx
<div class={() => get(isActive) ? 'active' : ''}>...</div>
<input disabled={() => get(isLoading)} />
<div style={() => ({ color: get(themeColor) })}>...</div>
```


### Transactional Updates with `batch()`

Group multiple state writes and flush UI updates once:

```tsx
import { batch, set } from "@potetotown/vitrio";

batch(() => {
  set(firstName, "Ada");
  set(lastName, "Lovelace");
  set(isSaving, false);
});
```

### Deferred Updates with `startTransition()`

Run non-urgent updates asynchronously to keep interactions responsive:

```tsx
import { startTransition, set } from "@potetotown/vitrio";

await startTransition(() => {
  set(filter, "enterprise");
  set(sortBy, "revenue");
});
```

## API Reference

| API                      | Description             |
| ------------------------ | ----------------------- |
| `v(initial)`             | Create reactive atom    |
| `derive(fn)`             | Create computed value   |
| `get(atom)`              | Read current value      |
| `set(atom, value)`       | Update value            |
| `batch(fn)`             | Batch multiple updates  |
| `startTransition(fn)`   | Schedule non-urgent updates |
| `subscribe(atom, fn)`    | Listen to changes       |
| `use(atom)`              | Hook: `[value, setter]` |
| `render(jsx, container)` | Mount to DOM            |
| `createStore(init)`      | Create nested store     |
| `createContext(def)`     | Create context          |
| `createResource(src, fn)`| Async data fetching     |
| `Router` / `Route`       | Routing components      |
| `Suspense`               | Handle async loading    |
| `ErrorBoundary`          | Handle render errors    |

## Control Flow

```tsx
import { Show, For } from '@potetotown/vitrio'

// Conditional
<Show when={isLoggedIn}>
  <Dashboard />
</Show>

// Lists with keyed diffing
<For each={items} key={(item) => item.id}>
  {(item) => <li>{item.name}</li>}
</For>
```

## Suspense & Async

Vitrio supports concurrent rendering features like Suspense. When a resource is read inside a Suspense boundary, it will suspend rendering until the data is ready.

`createResource` also supports retries and backoff options for production APIs:

```tsx
const user = createResource(
  () => userId(),
  async (id, { signal }) => fetch(`/api/users/${id}`, { signal }).then((r) => r.json()),
  { retries: 2, retryDelayMs: (attempt) => attempt * 200 }
);
```

```tsx
import { createResource, Suspense } from '@potetotown/vitrio';

const user = createResource(async () => {
  const res = await fetch('/api/user');
  return res.json();
});

function Profile() {
  // Reading the resource suspends if loading
  return <div>Hello, {user().name}</div>;
}

<Suspense fallback={<div>Loading...</div>}>
  <Profile />
</Suspense>
```

## Error Handling

Catch render errors with ErrorBoundary.

```tsx
import { ErrorBoundary } from '@potetotown/vitrio';

<ErrorBoundary fallback={(err) => <div>Error: {err.message}</div>}>
  <App />
</ErrorBoundary>
```

## Commercial Readiness

Vitrio is MIT licensed and can be used in commercial products.

- Security process: see [SECURITY.md](./SECURITY.md)
- Support expectations: see [SUPPORT.md](./SUPPORT.md)
- Contribution and release workflow: see [CONTRIBUTING.md](./CONTRIBUTING.md)
- Version history: see [CHANGELOG.md](./CHANGELOG.md)

## Documentation

- [Getting Started](./docs/getting-started.md)
- [Core API](./docs/api.md)
- [JSX & Components](./docs/jsx.md)
- [Control Flow](./docs/control-flow.md)
- [Store](./docs/store.md)
- [Context](./docs/context.md)
- [Router](./docs/router.md)
- [Resource](./docs/resource.md)
- [Benchmarks](./docs/benchmarks.md)
- [React Compatibility](./docs/react-compatibility.md)
- [Capabilities](./docs/capabilities.md)
- [Optimization](./docs/optimization.md)
- [Security Policy](./SECURITY.md)
- [Support Policy](./SUPPORT.md)

## Examples & Development

```bash
# Install dependencies
bun install

# Run counter demo
bun run dev

# Build library
bun run build

# Run benchmarks (Bun - recommended)
bun benchmarks/run.ts

# Run benchmarks (Node.js alternative)
node benchmarks/run-node.mjs
```

See [examples/counter](./examples/counter) for a complete demo.

## Comparison

| Feature         | Vitrio | React | Solid | Jotai |
| --------------- | ------ | ----- | ----- | ----- |
| Bundle size     | ~12KB  | ~40KB | ~13KB | ~3KB  |
| No virtual DOM  | ✅     | ❌    | ✅    | -     |
| Fine-grained    | ✅     | ❌    | ✅    | ✅    |
| TSX support     | ✅     | ✅    | ✅    | ✅    |
| 100-click speed | 🥇     | 🥉    | 🥈    | -     |

## License

MIT © 2026
