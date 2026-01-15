# Benchmark Results

| Metric | Vitrio (WASM) | SolidJS | React |
|--------|---------------|---------|-------|
| Bundle Size (bytes) | 14110 | 12970 | 144132 |
| Avg Load Time (ms) | 78.89 | 71.98 | 89.14 |
| Interaction (100 clicks) (ms) | 29.40 | 26.10 | 39.53 |
| List Update (50 add, 25 remove) (ms) | 21.31 | 29.47 | 27.40 |

## Performance Comparison

- **Counter (100 clicks)**: Vitrio is -11.2% slower than Solid, 34.5% faster than React
- **List Updates**: Vitrio is 38.3% faster than Solid

*Run on 2026-01-15T04:06:38.423Z*
