# Introduction / Tutorial

Vitrio is a **performance-first React alternative** with fine-grained reactivity.
This tutorial shows the simplest “app-style” setup:

- SPA routing
- route `loader` (data fetching)
- route `action` (mutations)
- `<Suspense>` for async UI
- `<Form>` for ergonomic actions

> Server-side features are intentionally out-of-scope for now.

---

## 1) Install

```bash
bun add @potetotown/vitrio
```

---

## 2) Render an app

```tsx
import { render } from "@potetotown/vitrio";
import { App } from "./app";

render(<App />, document.getElementById("app"));
```

---

## 3) A tiny app with routes + loader/action

```tsx
import {
  Router,
  Route,
  A,
  Suspense,
  Form,
  v,
  get,
  set,
} from "@potetotown/vitrio";

const apiCount = v(0);

export function App() {
  return (
    <Router>
      <Suspense fallback={<div>loading...</div>}>
        <Route path="/">
          {() => (
            <div>
              <h1>Home</h1>
              <A href="/users/42">go</A>
            </div>
          )}
        </Route>

        <Route
          id="user"
          path="/users/:id"
          loader={({ params }) => {
            // fake async
            return Promise.resolve({ id: params.id, count: get(apiCount) });
          }}
          action={(_, input: { inc: number }) => {
            set(apiCount, (c) => c + input.inc);
            return { ok: true as const };
          }}
        >
          {(data, ctx) => (
            <div>
              <h1>User {data.id}</h1>
              <div>count: {data.count}</div>

              <Form action={ctx.action}>
                <input type="hidden" name="inc" value="1" />
                <button type="submit">inc</button>
              </Form>

              <A href="/">back</A>
            </div>
          )}
        </Route>
      </Suspense>
    </Router>
  );
}
```

---

## 4) Cache & invalidation

Route loaders are cached. You can invalidate:

- `invalidateRoute("user")`: clear all cache entries for a route id/prefix
- `invalidateCurrent()`: clear only the **currently matched route instance** (params + search)

Actions default to invalidating the current route instance when a loader exists.
