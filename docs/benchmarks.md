# Benchmarks

Vitrio is designed to be **faster than Solid.js** through Solid-style DOM updates and fine-grained reactivity.

## Running Benchmarks


```bash

node benchmark/run-node.mjs
```

### With Node.js

If you prefer Node.js or have issues with Bun's Playwright integration:

```bash
# Requires Node.js 18+ and Playwright installed
node benchmarks/run-node.mjs
```

## Benchmark Results

| Metric | Vitrio | SolidJS | React |
|--------|--------|---------|-------|
| Bundle Size | **8KB** | 13KB | 144KB |
| Avg Load Time | 69.66ms | **48.81ms** | 50.52ms |
| 100 Clicks | **11.92ms** | 16.41ms | 17.35ms |
| List Update (50 add, 25 remove) | **12.72ms** | 16.19ms | 44.24ms |

## Performance Analysis

### Counter (100 clicks)
- **Vitrio is 37.7% faster than Solid**
- Vitrio is 45.6% faster than React

### List Updates
- **Vitrio is 27.3% faster than Solid**
- **Vitrio is 247.8% faster than React**
- Uses keyed diffing to minimize DOM operations

## Why Vitrio is Fast

1. **Solid-style DOM**: Create DOM once, update bindings only
2. **No VDOM diffing**: Direct DOM manipulation
3. **Fine-grained subscriptions**: Only affected nodes re-render
4. **Marker-based flow control**: `Show`/`For` use comment markers, not container elements
5. **Keyed reconciliation**: `For` reuses existing DOM nodes when possible
6. **Batched updates**: Multiple state changes are batched into a single microtask

## Benchmark Apps

All benchmark apps have identical functionality:
- Counter with derived value (×2)
- Todo list with add/remove
- Toggle section

Located in:
- `benchmarks/vitrio-app/` - Vitrio implementation
- `benchmarks/solid-app/` - SolidJS implementation  
- `benchmarks/react-app/` - React implementation
