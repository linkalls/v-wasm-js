# Vitrio

**Ultra-minimal reactive UI framework** - Jotai-inspired simplicity with React-like TSX.

[![npm version](https://badge.fury.io/js/@potetotown%2Fvitrio.svg)](https://www.npmjs.com/package/@potetotown/vitrio)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

English | [日本語](./README.ja.md)

## 🚀 Performance

**Vitrio matches Solid.js** on reactivity benchmarks:

| Metric | Vitrio | SolidJS | React |
|--------|--------|---------|-------|
| Bundle Size | 15KB | 13KB | 144KB |
| 100 Clicks (ms) | **17.03** | 16.17 | 21.95 |
| List Updates (ms) | 22.61 | 22.25 | 21.06 |

> 📊 See [benchmarks/results.md](./benchmarks/results.md) for full details.

## Features

- 🎯 **Minimal API** - Just `v()`, `derive()`, `get()`, `set()`
- ⚡ **Reactive** - Fine-grained updates with automatic dependency tracking
- 🏎️ **Solid-style DOM** - Create once, update bindings (no VDOM diffing)
- 🎨 **React-like TSX** - Write components naturally with JSX
- 📦 **Tiny** - ~8KB minified
- 🔧 **Bun-first** - Built for modern tooling

## Installation

```bash
bun add @potetotown/vitrio
# or
npm install @potetotown/vitrio
```

## Quick Start

```tsx
import { v, derive, get, set, render } from '@potetotown/vitrio'

// 1. Create reactive state
const count = v(0)
const doubled = derive(get => get(count) * 2)

// 2. Write React-like components
function Counter() {
  return (
    <div>
      <button onClick={() => set(count, c => c - 1)}>-</button>
      <span>{() => get(count)}</span>
      <span style="color: gray">(×2 = {() => get(doubled)})</span>
      <button onClick={() => set(count, c => c + 1)}>+</button>
    </div>
  )
}

// 3. Render
render(<Counter />, document.getElementById('app'))
```

## Core Concepts

### Atoms with `v()`

Create reactive values:

```tsx
const name = v('John')
const age = v(25)
const user = v({ id: 1, role: 'admin' })
```

### Derived State with `derive()`

Computed values that auto-update:

```tsx
const count = v(10)
const doubled = derive(get => get(count) * 2)     // 20
const message = derive(get => `Count: ${get(count)}`)
```

### Reading & Writing

```tsx
// Read
const currentCount = get(count)

// Write
set(count, 5)                    // Direct value
set(count, c => c + 1)           // Updater function
```

### Reactive Text Nodes

Use functions in JSX for auto-updating text:

```tsx
<span>{() => get(count)}</span>  // Re-renders when count changes
```

### Reactive Attributes

Attributes can also be reactive functions:

```tsx
<div class={() => get(isActive) ? 'active' : ''}>...</div>
<input disabled={() => get(isLoading)} />
<div style={() => ({ color: get(themeColor) })}>...</div>
```

## API Reference

| API | Description |
|-----|-------------|
| `v(initial)` | Create reactive atom |
| `derive(fn)` | Create computed value |
| `get(atom)` | Read current value |
| `set(atom, value)` | Update value |
| `subscribe(atom, fn)` | Listen to changes |
| `use(atom)` | Hook: `[value, setter]` |
| `render(jsx, container)` | Mount to DOM |

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

## Documentation

- [Getting Started](./docs/getting-started.md)
- [Core API](./docs/api.md)
- [JSX & Components](./docs/jsx.md)
- [Control Flow](./docs/control-flow.md)
- [Benchmarks](./docs/benchmarks.md)

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

| Feature | Vitrio | React | Solid | Jotai |
|---------|--------|-------|-------|-------|
| Bundle size | ~8KB | ~40KB | ~13KB | ~3KB |
| No virtual DOM | ✅ | ❌ | ✅ | - |
| Fine-grained | ✅ | ❌ | ✅ | ✅ |
| TSX support | ✅ | ✅ | ✅ | ✅ |
| 100-click speed | 🥇 | 🥉 | 🥈 | - |

## License

MIT © 2024