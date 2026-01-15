# Benchmarks

Vitrio is designed to be **faster than Solid.js** through Solid-style DOM updates and fine-grained reactivity.

## Running Benchmarks

```bash
# Requires Node.js 18+ and Playwright installed
node benchmarks/run-node.mjs
```

## Benchmark Results (2026-01-15)

| Metric | Vitrio | SolidJS | React |
|--------|--------|---------|-------|
| Bundle Size | **10.3KB** | 13KB | 144KB |
| Avg Load Time | 36.22ms | **24.93ms** | 29.29ms |
| 100 Clicks | **7.82ms** | 8.26ms | 8.99ms |
| List Update | **5.92ms** | 11.91ms | 8.74ms |

## Performance Analysis

### List Updates (Major Improvement!)
- **Vitrio is 50% faster than Solid** (5.9ms vs 11.9ms)
- **Vitrio is 32% faster than React** (5.9ms vs 8.7ms)
- Uses optimized `<For>` component with keyed reconciliation

### Counter (100 clicks)
- Vitrio is 5% faster than Solid (7.8ms vs 8.3ms)
- Vitrio is 13% faster than React (7.8ms vs 9.0ms)

### Bundle Size
- **Vitrio is 21% smaller than Solid** (10KB vs 13KB)
- **Vitrio is 93% smaller than React** (10KB vs 144KB)

### Load Time
- Vitrio is slower due to WASM initialization overhead
- Future optimization: lazy WASM loading

## Optimization History

### v0.1.3 (2026-01-15)
- Fixed `<For>` component to properly handle JSX children arrays
- Fixed `<Show>` component for same issue
- Updated JSX type definitions for VNode compatibility
- **List Update**: 12.7ms → 5.9ms (**53% improvement**)
- **Bundle Size**: 12.4KB → 10.3KB (**17% reduction**)

### v0.1.2 → v0.1.3 WASM Optimization
- **WASM size**: 3.9KB → 1.5KB (**61% reduction**)
- **JS bundle**: 7.8KB → 4.5KB (**43% reduction**)
- Added `-d no_bounds_checking` build flag

## Why Vitrio is Fast

1. **Solid-style DOM**: Create DOM once, update bindings only
2. **No VDOM diffing**: Direct DOM manipulation
3. **Fine-grained subscriptions**: Only affected nodes re-render
4. **Marker-based flow control**: `Show`/`For` use comment markers
5. **Keyed reconciliation**: `For` reuses existing DOM nodes
6. **Batched updates**: Multiple state changes are batched
7. **WASM-powered graph**: Dependency propagation in optimized WASM

## Benchmark Apps

All benchmark apps have identical functionality:
- Counter with derived value (×2)
- Todo list with add/remove
- Toggle section

Located in:
- `benchmarks/vitrio-app/` - Vitrio implementation
- `benchmarks/solid-app/` - SolidJS implementation  
- `benchmarks/react-app/` - React implementation
