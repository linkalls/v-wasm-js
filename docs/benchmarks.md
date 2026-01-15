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
| Bundle Size | **10.8KB** | 13KB | 144KB |
| Avg Load Time | 54.58ms | **33.10ms** | 45.31ms |
| 100 Clicks | 8.52ms | 7.63ms | **7.07ms** |
| List Update | **6.71ms** | 8.08ms | 8.55ms |

## Performance Analysis

### Bundle Size
- **Vitrio is 16% smaller than Solid**
- **Vitrio is 92% smaller than React**

### List Updates
- **Vitrio is 20.4% faster than Solid**
- **Vitrio is 27.4% faster than React**
- Uses keyed diffing to minimize DOM operations

### Counter (100 clicks)
- Vitrio is 10.4% slower than Solid (WASM bridge overhead)
- Future optimization: batch WASM calls

### Load Time
- Vitrio is slower due to WASM initialization overhead
- Future optimization: lazy WASM loading

## Optimization History

### v0.1.2 → v0.1.3 (2026-01-15)
- **WASM size**: 3.9KB → 1.5KB (**61% reduction**)
- **JS bundle**: 7.8KB → 4.5KB (**43% reduction**)
- Added `@[direct_array_access]` to V code
- Removed console.log statements
- Added `-d no_bounds_checking` build flag

See [optimization.md](./optimization.md) for details.

## Why Vitrio is Fast

1. **Solid-style DOM**: Create DOM once, update bindings only
2. **No VDOM diffing**: Direct DOM manipulation
3. **Fine-grained subscriptions**: Only affected nodes re-render
4. **Marker-based flow control**: `Show`/`For` use comment markers, not container elements
5. **Keyed reconciliation**: `For` reuses existing DOM nodes when possible
6. **Batched updates**: Multiple state changes are batched into a single microtask
7. **WASM-powered graph**: Dependency propagation runs in optimized WebAssembly

## Benchmark Apps

All benchmark apps have identical functionality:
- Counter with derived value (×2)
- Todo list with add/remove
- Toggle section

Located in:
- `benchmarks/vitrio-app/` - Vitrio implementation
- `benchmarks/solid-app/` - SolidJS implementation  
- `benchmarks/react-app/` - React implementation

