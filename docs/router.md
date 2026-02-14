# Router

Vitrio provides a simple history-based client-side router.

## Usage

```tsx
import { Router, Route, A, location } from '@potetotown/vitrio';

// 1. Wrap your app in Router
function App() {
  return (
    <Router>
      <header>
        <A href="/">Home</A> | <A href="/about">About</A>
      </header>

      {/* 2. Define Routes */}
      <Route path="/">
        <Home />
      </Route>
      <Route path="/about">
        <About />
      </Route>
      <Route path="/users/*">
        <Users />
      </Route>
    </Router>
  );
}

// 3. Navigate
function Login() {
  const navigate = () => {
    // Programmatic navigation
    navigate("/dashboard");
  };
  return <button onClick={navigate}>Login</button>;
}
```

## API

### `<Router>`
Sets up the history listener.

### `<Route path="path">`
Conditionally renders children if `path` matches `location.path`.
- **Props:**
  - `path`: Exact match, or use `*` for wildcards (e.g. `/users/*`).

### `<A href="url">`
A link component that uses `pushState` for navigation without full page reload.

### `location`
A reactive `VAtom` containing `{ path, query, hash }`. You can `get(location)` anywhere.

### `navigate(to: string)`
Programmatically navigate to a path.
