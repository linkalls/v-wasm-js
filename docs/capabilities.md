# Capabilities and Limitations

## Vitrio v0.0.2 - Capability Matrix

This document is the source of truth for what is **ready**, **experimental**, and **planned**.

### ✅ Production-Ready Features

| Feature | Status | Description |
|---------|--------|-------------|
| Reactive State Management | ✅ Ready | Fine-grained reactivity with `v()` and `derive()` |
| JSX Rendering | ✅ Ready | Supports React-like TSX syntax |
| Conditional Rendering (`Show`) | ✅ Ready | Render based on conditions via `when` prop |
| List Rendering (`For`) | ✅ Ready | High-performance lists with keyed updates |
| Routing | ✅ Ready | History API-based SPA routing |
| Store (Nested State) | ✅ Ready | Proxy-based reactive objects |
| Event Handling | ✅ Ready | Standard DOM events like `onClick`, `onInput` |
| Resource (async state) | ✅ Ready | `createResource` supports loading/error/refetch |
| Error Boundary | ✅ Ready | Render fallback UI when children throw |
| Suspense | ✅ Ready | Async boundary with fallback rendering |
| Server-side rendering (`renderToString`) | ✅ Ready | String rendering API via `@potetotown/vitrio/server` |
| Transitions (`startTransition`) | ✅ Ready | Defers non-urgent updates for smoother interactions |

### ⚠️ Experimental Features (Use with Caution)

| Feature | Status | Note |
|---------|--------|------|
| WASM Optimization | ⚠️ Experimental | Dependency graph engine written in V; fast but harder to debug |
| Context API | ⚠️ Experimental | Core use-cases work, complex DI patterns are less battle-tested |
| Hydration | ⚠️ Experimental | Initial SSR-to-client hydration strategy is still evolving |

### ❌ Not Yet Supported / Not Included

**1. Streaming SSR**
- `renderToString` is supported
- Streaming APIs are not yet implemented

**2. Developer Tools (DevTools)**
- No visual debugger like React DevTools
- State tracking is mainly via logs/custom instrumentation

**3. Strict TypeScript Inference for all JSX edge-cases**
- Strong TS support exists, but some JSX edge-cases are still broad (`any`-leaning)

**4. Official test utility package**
- No framework-specific test helper package yet
- Use Vitest/Jest/Playwright with custom setup

### 🔬 Browser Compatibility

**Verified**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Unverified**
- Internet Explorer (unsupported)
- Older mobile browsers (iOS 13 or older, Android 7 or older)
- Some embedded WebView environments

### 🛡️ Security Notes

- Vitrio avoids `innerHTML` in normal render paths by default.
- You are still responsible for sanitizing untrusted HTML if using `innerHTML` explicitly.
- See `SECURITY.md` for reporting and response policy.

### 📊 Performance Scope

Benchmarks show strong results in the provided scenarios, but outcomes vary by app shape, runtime, and hardware.
Use `benchmarks/run.ts` or `benchmarks/run-node.mjs` to reproduce in your environment.

### Commercial Adoption Guidance

**Good fit for:**
- Performance-sensitive SPAs
- Internal dashboards and tooling
- Product surfaces where small bundle size matters

**Adopt carefully when:**
- You require streaming SSR today
- You need an ecosystem-level DevTools/testing suite out of the box
- You need strict long-term platform support guarantees without internal ownership
