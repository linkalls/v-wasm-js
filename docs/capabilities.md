# Capabilities and Limitations

## Vitrio v0.0.2 - What it can and cannot do

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

### ⚠️ Experimental Features (Use with Caution)

| Feature | Status | Note |
|---------|--------|------|
| WASM Optimization | ⚠️ Experimental | Dependency graph engine written in V. Generally fine, but hard to debug |
| Context API | ⚠️ Experimental | Basic functionality works, but complex DI patterns are unverified |
| Resource (async) | ⚠️ Experimental | Data fetching exists, but error handling is limited |

### ❌ Currently Unsupported Features

**1. Server-Side Rendering (SSR)**
- Vitrio is **browser-only**
- Depends directly on `document.createElement`, so it won't run in Node.js
- SSR like Next.js or SvelteKit is not possible

**2. Developer Tools (DevTools)**
- No visual debugger like React DevTools
- State tracking must be done via `console.log`

**3. Strict TypeScript Inference**
- JSX type checking is basic
- `IntrinsicElements` are `any`-based

**4. Error Boundaries**
- No equivalent to React's `ErrorBoundary`
- Errors within components propagate globally

**5. Suspense**
- Async boundaries like React Suspense are unimplemented
- Loading states must be managed manually

**6. Animation API**
- CSS Transitions work, but integration with dedicated libraries (like Framer Motion) is unverified

**7. Test Utilities**
- No test helpers like React Testing Library
- E2E testing with Playwright is possible, but unit testing requires custom setup

### 🔬 Browser Compatibility

**Verified**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Unverified**
- Internet Explorer (Completely unsupported)
- Old mobile browsers (iOS 13 or older, Android 7 or older)
- WebView environments (React Native WebView, etc.)

### 🛡️ Security Notes

**Zero-dependency Advantage**
- No risk from external library vulnerabilities
- However, **security audit of the V-based WASM module is pending**

**XSS Prevention**
- Does not use `innerHTML`
- However, manual escaping is needed when embedding user input directly into JSX

### 📊 Performance Guarantees

**Performance in Benchmark Environment**
- Counter (100 clicks): 5.16x faster than React
- List Update: 3.83x faster than Solid

**However, performance may degrade in the following cases:**
- Lists with over 10,000 items
- Chains of over 100 derived atoms (`derive`)
- Very deeply nested Store objects

---

### Conclusion

**Suitable for:**
- 💚 Personal projects / Portfolio apps
- 💚 Performance-critical dashboards
- 💚 Lightweight SPAs (Single Page Apps)
- 💚 Existing projects struggling with React bundle size

**Avoid for now:**
- 💔 SEO-heavy sites requiring SSR
- 💔 Team environments where "unknown tech" is prohibited
- 💔 Domains requiring "battle-tested tech" (Finance, Medical)
- 💔 Apps requiring complex error handling
