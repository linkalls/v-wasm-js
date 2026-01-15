# Benchmark Results

| Metric | Vitrio (WASM) | SolidJS | React |
|--------|---------------|---------|-------|
| Bundle Size (bytes) | 10,261 | 12,970 | 144,132 |
| Avg Load Time (ms) | 36.22 | 24.93 | 29.29 |
| Interaction (100 clicks) (ms) | 7.82 | 8.26 | 8.99 |
| List Update (50 add, 25 remove) (ms) | 5.92 | 11.91 | 8.74 |

## Performance Comparison

- **Counter (100 clicks)**: Vitrio is 5% faster than Solid, 13% faster than React
- **List Updates**: Vitrio is **50% faster than Solid**, 32% faster than React
- **Bundle Size**: Vitrio is 21% smaller than Solid, 93% smaller than React

*Run on 2026-01-15T21:26:00Z*
